from .. import models
from .. import schemas


def dominant_error(counts: dict) -> str | None:
    order = ['depth_insufficient', 'too_fast', 'incomplete_extension']
    winner = max(order, key=lambda key: counts[key])
    return winner if counts[winner] else None


async def summary(current_user: schemas.UserCurrent, recent_limit: int) -> dict:
    data = await models.progress.progress_summary(current_user.id, recent_limit)
    camera_total = data.get('camera_total_reps', data['total_reps'])
    data['rejected_reps'] = camera_total - data['accepted_reps']
    data['acceptance_rate'] = data['accepted_reps'] / camera_total if camera_total else 0.0
    for row in data['recent_sessions']:
        row['generic_error_counts'] = row.get('generic_error_counts') or {}
        legacy = row.pop('error_counts')
        counts = {
            code: legacy[code]
            for code in ['depth_insufficient', 'too_fast', 'incomplete_extension']
        }
        counts.update(row['generic_error_counts'])
        row['dominant_error'] = max(counts, key=counts.get) if any(counts.values()) else None
    return data
