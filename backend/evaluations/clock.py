from django.core.cache import cache
from django.utils import timezone

SIMULATED_DATE_KEY = "simulated_date"


def simulated_date():
    return cache.get(SIMULATED_DATE_KEY)


def set_simulated_date(value):
    if value is None:
        cache.delete(SIMULATED_DATE_KEY)
    else:
        cache.set(SIMULATED_DATE_KEY, value, None)


def today():
    return simulated_date() or timezone.localdate()


def now():
    real_now = timezone.now()
    simulated = simulated_date()
    if simulated is None:
        return real_now
    return real_now + (simulated - timezone.localdate(real_now))