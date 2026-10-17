"""Shared, conservative faculty Due/Overdue calculation for Assessment Helper.

Policy assumptions (confirm with the Assessment Committee):
- Assistant Professor: every calendar year; Associate/Full Professor: every 2 years.
- A cycle is assigned to cycle.start_date.year.
- Once a full required year goes by without completion, status becomes overdue.
- Missing evaluation history or unrecognized rank => undetermined.
- Approved carry-forward into target cycle => due (not overdue).
- Only fully signed, completed observee-side observations count as completed.
"""
from django.db.models import Q
from .models import Observation, EvaluationCarryForward


def evaluation_status_for(user, cycle):
    rank = (user.academic_level or "").strip().lower()
    if rank in ("assistant", "assistant professor", "asst professor", "asst. professor"):
        interval = 1
    elif rank in ("associate", "associate professor", "full", "full professor", "professor"):
        interval = 2
    else:
        return _result("undetermined", "Academic rank is missing or not mapped to an evaluation interval.")

    cycle_year = cycle.start_date.year
    completed_years = []
    # Completion must be for this professor as OBSERVEE, not observer.
    records = Observation.objects.filter(
        pairing__observee=user, status="completed",
        observer_signed=True, observee_signed=True,
    ).select_related("pairing")
    for record in records:
        completion_date = record.observee_signed_at or record.observer_signed_at
        if completion_date:
            completed_years.append(completion_date.year)
        elif record.pairing.confirmed_datetime:
            # Legacy test records without signature timestamps; less precise.
            completed_years.append(record.pairing.confirmed_datetime.year)
    if user.last_evaluated_year is not None:
        completed_years.append(user.last_evaluated_year)
    last_year = max(completed_years) if completed_years else None

    # A completed evaluation in this cycle satisfies the cycle regardless of
    # the historical year fields.
    completed_in_cycle = records.filter(pairing__cycle=cycle).exists()
    carried = EvaluationCarryForward.objects.filter(
        target_cycle=cycle, source_signup__user=user
    ).exists()
    if completed_in_cycle:
        return _result("not_due", "Evaluation completed in this cycle.", last_year, interval)
    if carried:
        return _result("due", "Committee-approved carry-forward into this cycle.", last_year, interval)
    if last_year is None:
        return _result("undetermined", "No verified last completed evaluation year.", None, interval)
    next_year = last_year + interval
    if cycle_year < next_year:
        state = "not_due"
        reason = f"Next evaluation is due in calendar year {next_year}."
    elif cycle_year == next_year:
        state = "due"
        reason = f"Evaluation is due during calendar year {cycle_year}."
    else:
        state = "overdue"
        reason = f"Evaluation was due in calendar year {next_year} and remains incomplete."
    return _result(state, reason, last_year, interval, next_year)


def _result(status, reason, last_year=None, interval=None, next_year=None):
    if next_year is None and last_year is not None and interval is not None:
        next_year = last_year + interval
    return {
        "status": status,
        "reason": reason,
        "last_completed_year": last_year,
        "evaluation_interval_years": interval,
        "next_due_year": next_year,
    }
