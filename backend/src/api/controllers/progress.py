from .. import models
from .. import schemas


def dominant_error(counts: dict) -> str | None:
    order = ['depth_insufficient', 'too_fast', 'incomplete_extension']
    winner = max(order, key=lambda key: counts[key])
    return winner if counts[winner] else None


async def summary(current_user: schemas.UserCurrent, recent_limit: int) -> dict:
    data = await models.progress.progress_summary(current_user.id, recent_limit)
    data['rejected_reps'] = data['total_reps'] - data['accepted_reps']
    data['acceptance_rate'] = (
        data['accepted_reps'] / data['total_reps'] if data['total_reps'] else 0.0
    )
    for row in data['recent_sessions']:
        row['dominant_error'] = dominant_error(row.pop('error_counts'))
    return data
