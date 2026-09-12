"""Разбор даты и времени выполнения задачи из текста на русском языке.

Стратегия: сначала вытаскиваем явные конструкции регулярными выражениями
(дата вида 30.09, время вида 18:30 / «в 7 вечера»), затем нормализуем
падежные формы дней недели, и отдаём остаток библиотеке dateparser,
которая умеет «завтра», «через 2 дня», «в пятницу», «5 октября».
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, time, timedelta

from dateparser.search import search_dates

WEEKDAYS = {
    "понедельник": ("понедельник", "понедельника", "понедельнику"),
    "вторник": ("вторник", "вторника", "вторнику"),
    "среда": ("среда", "среду", "среды", "среде"),
    "четверг": ("четверг", "четверга", "четвергу"),
    "пятница": ("пятница", "пятницу", "пятницы", "пятнице"),
    "суббота": ("суббота", "субботу", "субботы", "субботе"),
    "воскресенье": ("воскресенье", "воскресенья", "воскресенью"),
}
WEEKDAY_INDEX = {name: i for i, name in enumerate(WEEKDAYS)}
_WEEKDAY_FORM_TO_NAME = {form: name for name, forms in WEEKDAYS.items() for form in forms}

DAYPART_DEFAULT_TIME = {
    "утром": time(9, 0),
    "днём": time(13, 0),
    "днем": time(13, 0),
    "вечером": time(18, 0),
    "ночью": time(23, 0),
}

_RE_DATE = re.compile(r"(?<!\d)(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?!\d)")
_RE_TIME = re.compile(
    r"(?:(?:\bв|\bк|\bна)\s+)?(?<!\d)(\d{1,2})(?::(\d{2}))?\s*(утра|дня|вечера|ночи|часов|ч\b)?(?!\d)",
    re.IGNORECASE,
)
_RE_WEEKDAY = re.compile(
    r"\b(?:(?:в|во|до|к|на)\s+)?(" + "|".join(sorted(_WEEKDAY_FORM_TO_NAME, key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)
_RE_DAYPART = re.compile(r"\b(" + "|".join(DAYPART_DEFAULT_TIME) + r")\b", re.IGNORECASE)
_RE_TRAILING_PREPOSITION = re.compile(r"\s+(в|во|до|к|на|через)\s*$", re.IGNORECASE)


@dataclass
class ParseResult:
    title: str
    due_at: datetime | None
    matched: list[str]


def _clean(text: str) -> str:
    text = re.sub(r"\s{2,}", " ", text).strip(" ,.-")
    text = _RE_TRAILING_PREPOSITION.sub("", text)
    return text.strip()


def _to_time(hour: int, minute: int, suffix: str | None) -> time | None:
    suffix = (suffix or "").lower()
    if suffix in ("вечера", "дня") and hour < 12:
        hour += 12
    if suffix == "ночи" and hour == 12:
        hour = 0
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        return None
    return time(hour, minute)


def parse_task(text: str, now: datetime | None = None) -> ParseResult:
    now = now or datetime.now()
    rest = text.strip()
    matched: list[str] = []
    due_date = None
    due_time: time | None = None

    m = _RE_DATE.search(rest)
    if m:
        day, month, year = int(m.group(1)), int(m.group(2)), m.group(3)
        year_int = now.year if year is None else (int(year) + 2000 if len(year) == 2 else int(year))
        try:
            candidate = datetime(year_int, month, day)
            if year is None and candidate.date() < now.date():
                candidate = candidate.replace(year=year_int + 1)
            due_date = candidate.date()
            matched.append(m.group(0))
            rest = rest[: m.start()] + " " + rest[m.end():]
        except ValueError:
            pass

    for m in _RE_TIME.finditer(rest):
        hour, minute, suffix = int(m.group(1)), m.group(2), m.group(3)
        explicit = minute is not None or suffix is not None or m.group(0).lower().lstrip().startswith(("в ", "к ", "на "))
        if not explicit:
            continue
        # «через 2 дня» — это интервал, а не время суток
        if re.search(r"через\s+$", rest[: m.start()], re.IGNORECASE):
            continue
        # «на 3 главы» или «в 2 раза» — числительные без признаков времени пропускаем
        if minute is None and suffix is None and hour > 23:
            continue
        parsed = _to_time(hour, int(minute or 0), suffix)
        if parsed is None:
            continue
        due_time = parsed
        matched.append(m.group(0).strip())
        rest = rest[: m.start()] + " " + rest[m.end():]
        break

    m = _RE_WEEKDAY.search(rest)
    if m and due_date is None:
        name = _WEEKDAY_FORM_TO_NAME[m.group(1).lower()]
        delta = (WEEKDAY_INDEX[name] - now.weekday()) % 7
        if delta == 0:
            delta = 7
        due_date = (now + timedelta(days=delta)).date()
        matched.append(m.group(0).strip())
        rest = rest[: m.start()] + " " + rest[m.end():]

    m = _RE_DAYPART.search(rest)
    if m:
        if due_time is None:
            due_time = DAYPART_DEFAULT_TIME[m.group(1).lower()]
        matched.append(m.group(0))
        rest = rest[: m.start()] + " " + rest[m.end():]

    if due_date is None:
        found = search_dates(
            rest,
            languages=["ru"],
            settings={
                "PREFER_DATES_FROM": "future",
                "RELATIVE_BASE": now,
                "RETURN_AS_TIMEZONE_AWARE": False,
                "PREFER_DAY_OF_MONTH": "first",
            },
        )
        if found:
            fragment, dt = found[0]
            if now.year <= dt.year <= now.year + 2:
                due_date = dt.date()
                if due_time is None and (dt.hour, dt.minute) != (now.hour, now.minute) and (dt.hour, dt.minute) != (0, 0):
                    due_time = dt.time().replace(second=0, microsecond=0)
                matched.append(fragment)
                rest = re.sub(re.escape(fragment), " ", rest, count=1, flags=re.IGNORECASE)

    if due_date is None and due_time is not None:
        # Только время: сегодня, если ещё не прошло, иначе завтра
        due_date = now.date() if due_time > now.time() else (now + timedelta(days=1)).date()

    due_at = None
    if due_date is not None:
        due_at = datetime.combine(due_date, due_time or time(0, 0))

    title = _clean(rest) or text.strip()
    return ParseResult(title=title, due_at=due_at, matched=matched)
