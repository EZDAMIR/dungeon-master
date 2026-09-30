import uuid

import pytest

from src.api import controllers, models

pytestmark = [pytest.mark.xdist_group('domains')]


async def test_progress_empty_totals_history_isolation(
    database, client, guest, session_payload, set_payload, completion_payload
):
    headers, _ = guest
    empty = (await client.get('/api/v1/progress/summary', headers=headers)).json()
    assert empty == {
        'completed_sessions': 0,
        'total_reps': 0,
        'accepted_reps': 0,
        'rejected_reps': 0,
        'acceptance_rate': 0.0,
        'error_counts': {'depth_insufficient': 0, 'too_fast': 0, 'incomplete_extension': 0},
        'recent_sessions': [],
    }
    for day in [1, 3, 2]:
        start = {
            **session_payload,
            'client_session_id': str(uuid.uuid4()),
            'started_at': f'2026-09-{day:02d}T00:00:00Z',
        }
        sid = (
            await client.post('/api/v1/workout-sessions', json=start, headers=headers)
        ).json()['id']
        path = '/api/v1/workout-sessions/' + sid
        assert (
            await client.post(
                path + '/sets',
                json={**set_payload, 'client_set_id': str(uuid.uuid4())},
                headers=headers,
            )
        ).status_code == 200
        done = {**completion_payload, 'completed_at': f'2026-09-{day:02d}T00:00:27Z'}
        assert (
            await client.post(path + '/complete', json=done, headers=headers)
        ).status_code == 200
        if day == 1:
            single = (await client.get('/api/v1/progress/summary', headers=headers)).json()
            assert single['completed_sessions'] == 1 and single['total_reps'] == 5
    await client.post(
        '/api/v1/workout-sessions',
        json={**session_payload, 'client_session_id': str(uuid.uuid4())},
        headers=headers,
    )
    response = await client.get('/api/v1/progress/summary?recent_limit=2', headers=headers)
    assert response.status_code == 200
    result = response.json()
    assert (
        result['completed_sessions'] == 3
        and result['total_reps'] == 15
        and result['accepted_reps'] == 9
    )
    assert result['rejected_reps'] == 6 and result['acceptance_rate'] == 0.6
    assert result['error_counts'] == {
        'depth_insufficient': 3,
        'too_fast': 3,
        'incomplete_extension': 0,
    }
    assert len(result['recent_sessions']) == 2
    assert [row['completed_at'][8:10] for row in result['recent_sessions']] == ['03', '02']
    assert result['recent_sessions'][0]['dominant_error'] == 'depth_insufficient'
    assert 'metrics' not in result['recent_sessions'][0]
    other = (await client.post('/api/v1/auth/guest')).json()
    assert (
        await client.get(
            '/api/v1/progress/summary',
            headers={'Authorization': 'Bearer ' + other['access_token']},
        )
    ).json() == empty
    for limit in [0, 21]:
        assert (
            await client.get(f'/api/v1/progress/summary?recent_limit={limit}', headers=headers)
        ).status_code == 422
    assert (
        type(await models.progress.progress_summary(uuid.UUID(other['user']['id']), 5)) is dict
    )


def test_dominant_error_ties():
    for counts, expected in [
        ({'depth_insufficient': 0, 'too_fast': 0, 'incomplete_extension': 0}, None),
        ({'depth_insufficient': 0, 'too_fast': 2, 'incomplete_extension': 2}, 'too_fast'),
        (
            {'depth_insufficient': 1, 'too_fast': 1, 'incomplete_extension': 1},
            'depth_insufficient',
        ),
        (
            {'depth_insufficient': 0, 'too_fast': 0, 'incomplete_extension': 1},
            'incomplete_extension',
        ),
    ]:
        assert controllers.progress.dominant_error(counts) == expected
