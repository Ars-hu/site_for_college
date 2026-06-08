from typing import TypedDict


class ApplicationOut(TypedDict):
    id: int
    fio: str
    phone: str
    email: str
    registration_date: str
    registration_time: str
    created_at: str
    status: str


class ArchivedApplicationOut(TypedDict):
    id: int
    original_id: int
    fio: str
    phone: str
    email: str
    registration_date: str
    registration_time: str
    status: str
    created_at: str
    archived_at: str


class SlotInfoOut(TypedDict):
    occupied: int
    max_capacity: int
    is_blocked: bool


class PaginatedApplications(TypedDict):
    items: list[ApplicationOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedArchive(TypedDict):
    items: list[ArchivedApplicationOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class AllowedMonthOut(TypedDict):
    year: int
    month: int


class BlockedDatesOut(TypedDict):
    blocked_dates: list[str]
    opened_weekends: list[str]


class DatesStatusOut(TypedDict):
    blocked_dates: list[str]
    full_dates: list[str]
    opened_weekends: list[str]
