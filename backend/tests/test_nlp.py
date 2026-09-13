from datetime import datetime

import pytest

from app.nlp import parse_task

# Вторник, 29 сентября 2026, 12:00
NOW = datetime(2026, 9, 29, 12, 0)


@pytest.mark.parametrize(
    "text, title, due",
    [
        ("завтра сходить к врачу", "сходить к врачу", datetime(2026, 9, 30)),
        ("послезавтра стирка", "стирка", datetime(2026, 10, 1)),
        ("сдать отчёт в пятницу в 15:00", "сдать отчёт", datetime(2026, 10, 2, 15, 0)),
        ("сделать домашку до понедельника", "сделать домашку", datetime(2026, 10, 5)),
        ("к четвергу подготовить презентацию", "подготовить презентацию", datetime(2026, 10, 1)),
        ("позвонить маме через 2 дня", "позвонить маме", datetime(2026, 10, 1)),
        ("встреча 5 октября в 10 утра", "встреча", datetime(2026, 10, 5, 10, 0)),
        ("созвон в 7 вечера", "созвон", datetime(2026, 9, 29, 19, 0)),
        ("сделать домашку 30.09", "сделать домашку", datetime(2026, 9, 30)),
        ("сделать домашку 30.09.2026 в 18:30", "сделать домашку", datetime(2026, 9, 30, 18, 30)),
        ("сегодня вечером почитать книгу", "почитать книгу", datetime(2026, 9, 29, 18, 0)),
    ],
)
def test_parses_dates(text, title, due):
    result = parse_task(text, now=NOW)
    assert result.title == title
    assert result.due_at == due
    assert result.matched


@pytest.mark.parametrize("text", ["купить молоко", "прочитать 3 главы", "купить 2 литра молока"])
def test_leaves_text_without_dates_untouched(text):
    result = parse_task(text, now=NOW)
    assert result.title == text
    assert result.due_at is None
    assert result.matched == []


def test_time_only_in_the_past_moves_to_tomorrow():
    result = parse_task("в 9:00 зарядка", now=NOW)
    assert result.due_at == datetime(2026, 9, 30, 9, 0)
