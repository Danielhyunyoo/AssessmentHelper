"""A07 read-only reporting. Metrics are explicitly provisional pending AC approval."""
from collections import defaultdict
from django.contrib.auth import get_user_model
from django.utils import timezone
from . import clock
from .evaluation_status import evaluation_status_for
from .models import Cycle, Signup, Pairing, Observation, Survey, EvaluationCarryForward


def rank_label(user):
    rank = (user.academic_level or '').strip()
    return rank or 'Unknown'


def cycle_metrics(cycle):
    User = get_user_model()
    faculty = list(User.objects.filter(role='faculty', is_active=True).order_by('pk'))
    status_by_user = {u.pk: evaluation_status_for(u, cycle)['status'] for u in faculty}
    by_rank = defaultdict(lambda: {
        'faculty_total': 0, 'due': 0, 'overdue': 0, 'not_due': 0,
        'undetermined': 0, 'unmatched': 0, 'outstanding_records': 0,
        'expected_surveys': 0, 'submitted_surveys': 0,
    })
    for user in faculty:
        entry = by_rank[rank_label(user)]
        entry['faculty_total'] += 1
        entry[status_by_user[user.pk]] += 1

    # A released zero-candidate signup counts as provisionally unmatched only
    # when not already confirmed, regardless of incomplete eligibility checks.
    confirmed_observees = set(Pairing.objects.filter(
        cycle=cycle, status='confirmed').values_list('observee_id', flat=True))
    unmatched_ids = set(Signup.objects.filter(
        cycle=cycle, user__role='faculty', user__is_active=True,
        course__isnull=False, matches_released_at__isnull=False,
        match_candidates__isnull=True,
    ).exclude(user_id__in=confirmed_observees).values_list('user_id', flat=True))
    user_by_id = {u.pk: u for u in faculty}
    for uid in unmatched_ids:
        if uid in user_by_id:
            by_rank[rank_label(user_by_id[uid])]['unmatched'] += 1

    pending_pairing_ids = []
    now = clock.now()
    # Prefetch prevents N+1 queries on observation and survey lists.
    pairings = Pairing.objects.filter(cycle=cycle, status='confirmed').prefetch_related(
        'observations', 'surveys'
    )
    for pairing in pairings:
        records = sorted(pairing.observations.all(), key=lambda r: r.pk)
        record = records[0] if records else None
        observee_rank = rank_label(user_by_id[pairing.observee_id]) if pairing.observee_id in user_by_id else 'Unknown'
        if pairing.confirmed_datetime and pairing.confirmed_datetime <= now and (
            record is None or record.status not in ('completed', 'cancelled')
        ):
            by_rank[observee_rank]['outstanding_records'] += 1
            pending_pairing_ids.append(pairing.pk)
        if record and record.status == 'completed' and record.observer_signed and record.observee_signed:
            for role, person_id in [('observer', pairing.observer_id), ('observee', pairing.observee_id)]:
                rank = rank_label(user_by_id[person_id]) if person_id in user_by_id else 'Unknown'
                by_rank[rank]['expected_surveys'] += 1
                if any(s.respondent_type == role and s.respondent_id == person_id and s.submitted_at
                       for s in pairing.surveys.all()):
                    by_rank[rank]['submitted_surveys'] += 1

    breakdown = []
    for rank, entry in sorted(by_rank.items()):
        expected = entry['expected_surveys']
        breakdown.append({'rank': rank, **entry,
                          'survey_completion_percent': round(100 * entry['submitted_surveys'] / expected, 2) if expected else None})

    keys = ('faculty_total', 'due', 'overdue', 'not_due', 'undetermined',
            'unmatched', 'outstanding_records', 'expected_surveys', 'submitted_surveys')
    totals = {key: sum(r[key] for r in breakdown) for key in keys}
    totals['missing_surveys'] = totals['expected_surveys'] - totals['submitted_surveys']
    totals['survey_completion_percent'] = (
        round(100 * totals['submitted_surveys'] / totals['expected_surveys'], 2)
        if totals['expected_surveys'] else None
    )
    return {
        'cycle': {'id': cycle.pk, 'name': cycle.semester,
                  'start_date': cycle.start_date.isoformat(), 'end_date': cycle.end_date.isoformat()},
        'generated_at': clock.now().isoformat(),
        'counts': totals,
        'by_rank': breakdown,
        'record_pairing_ids': pending_pairing_ids,
        'unmatched_faculty_ids': sorted(unmatched_ids),
    }


def kpi_report(cycle):
    current = cycle_metrics(cycle)
    history = []
    for c in Cycle.objects.filter(start_date__lte=cycle.start_date).order_by('start_date', 'pk'):
        metrics = current if c.pk == cycle.pk else cycle_metrics(c)
        history.append({
            'cycle_id': c.pk, 'semester': c.semester, 'year': c.start_date.year,
            'counts': metrics['counts'], 'by_rank': metrics['by_rank'],
        })
    return {
        **current,
        'historical_breakdown': history,
        'definitions': {
            'faculty_due': 'Active faculty with calculable due status in this cycle.',
            'outstanding_records': 'Confirmed past scheduled visits without a completed or cancelled record.',
            'unmatched': 'Released candidate lists containing zero observers, excluding confirmed pairings.',
            'surveys': 'Two required responses per fully signed, completed observation: observer and observee.',
        },
        'limitations': [
            'Provisional metrics pending Assessment Committee approval of KPI definitions.',
            'Missing rank/history counts as undetermined, never automatically overdue.',
            'Unmatched checks released zero-candidate lists only; complete eligibility logic is not implemented.',
            'No expected survey denominator yields a null completion percentage, not 100%.',
            'Historical Due/Overdue uses the currently stored faculty ranks/history, not a historical snapshot.',
            'Outstanding records are not counted until their confirmed visit datetime has passed.',
        ],
    }
