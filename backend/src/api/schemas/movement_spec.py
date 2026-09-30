"""Sprint 4A declarative movement contract; no executable expressions."""

import re
import typing

import pydantic

Identifier = typing.Annotated[
    str, pydantic.StringConstraints(strict=True, pattern=r'^[a-z][a-z0-9_]{0,79}$')
]
Number = typing.Annotated[float, pydantic.Field(allow_inf_nan=False, ge=-10000, le=10000)]
Milliseconds = typing.Annotated[int, pydantic.Field(strict=True, ge=0, le=30000)]
Operation = typing.Literal[
    'angle',
    'distance',
    'normalized_distance',
    'relative_x',
    'relative_y',
    'position_x',
    'position_y',
    'velocity_x',
    'velocity_y',
    'delta',
    'visibility',
    'body_scale',
    'average',
    'minimum',
    'maximum',
]
Operator = typing.Literal[
    'gt',
    'gte',
    'lt',
    'lte',
    'between',
    'approximately',
    'trend_up',
    'trend_down',
]
LANDMARKS = {
    'nose',
    'shoulder',
    'elbow',
    'wrist',
    'hip',
    'knee',
    'ankle',
    'heel',
    'foot_index',
}


def landmark(value: str) -> str:
    name = re.sub(r'^(left_|right_|active_)', '', value)
    if name not in LANDMARKS or (name == 'nose' and value != 'nose'):
        raise ValueError('Unknown landmark')
    return value


Landmark = typing.Annotated[Identifier, pydantic.AfterValidator(landmark)]


class StrictObject(pydantic.BaseModel):
    model_config = pydantic.ConfigDict(extra='forbid', validate_default=True)


class Messages(StrictObject):
    ru: (
        typing.Annotated[
            str, pydantic.StringConstraints(strict=True, min_length=1, max_length=56)
        ]
        | None
    ) = None
    kk: (
        typing.Annotated[
            str, pydantic.StringConstraints(strict=True, min_length=1, max_length=56)
        ]
        | None
    ) = None
    en: (
        typing.Annotated[
            str, pydantic.StringConstraints(strict=True, min_length=1, max_length=56)
        ]
        | None
    ) = None

    @pydantic.model_validator(mode='after')
    def readable(self):
        values = [v for v in (self.ru, self.kk, self.en) if v is not None]
        if not values or any(len(v.splitlines()) > 2 for v in values):
            raise ValueError('A cue needs text on at most two lines')
        return self


class SecondaryMessages(StrictObject):
    ru: (
        typing.Annotated[str, pydantic.StringConstraints(strict=True, max_length=120)] | None
    ) = None
    kk: (
        typing.Annotated[str, pydantic.StringConstraints(strict=True, max_length=120)] | None
    ) = None
    en: (
        typing.Annotated[str, pydantic.StringConstraints(strict=True, max_length=120)] | None
    ) = None


class Cue(StrictObject):
    messages: Messages
    secondary: SecondaryMessages | None = None


class Camera(StrictObject):
    preferred_angle: typing.Literal['side', 'front']
    body_scope: typing.Literal['full', 'upper']
    required_landmarks: typing.Annotated[
        list[Landmark], pydantic.Field(min_length=3, max_length=20)
    ]
    minimum_visibility: typing.Annotated[
        float, pydantic.Field(ge=0.5, le=1, allow_inf_nan=False)
    ]


class Calibration(StrictObject):
    stable_ms: typing.Annotated[int, pydantic.Field(strict=True, ge=400, le=5000)]
    baseline_features: typing.Annotated[list[Identifier], pydantic.Field(max_length=16)]
    messages: Messages


class Feature(StrictObject):
    id: Identifier
    operation: Operation
    points: typing.Annotated[list[Landmark], pydantic.Field(max_length=3)] = pydantic.Field(
        default_factory=list
    )
    inputs: typing.Annotated[list[Identifier], pydantic.Field(max_length=8)] = pydantic.Field(
        default_factory=list
    )
    normalize_by: typing.Literal['body_scale'] | None = None
    scope: typing.Literal['frame', 'rep'] = 'frame'

    @pydantic.model_validator(mode='after')
    def arity(self):
        point_counts = {
            'angle': 3,
            'distance': 2,
            'normalized_distance': 2,
            'relative_x': 2,
            'relative_y': 2,
            'position_x': 1,
            'position_y': 1,
            'velocity_x': 1,
            'velocity_y': 1,
            'visibility': 1,
        }
        if self.operation in point_counts:
            if len(self.points) != point_counts[self.operation] or self.inputs:
                raise ValueError('Invalid point arity')
        elif self.operation == 'body_scale':
            if self.points or self.inputs:
                raise ValueError('body_scale takes no inputs')
        elif not self.inputs or self.points:
            raise ValueError('Aggregate/delta features need earlier feature inputs')
        if self.operation == 'delta' and len(self.inputs) != 1:
            raise ValueError('delta needs one input')
        if self.scope == 'rep' and self.operation not in {'minimum', 'maximum', 'average'}:
            raise ValueError('Only aggregates support rep scope')
        return self


class Condition(StrictObject):
    feature: Identifier
    operator: Operator
    value: Number
    upper: Number | None = None
    tolerance: typing.Annotated[float, pydantic.Field(ge=0, le=1000, allow_inf_nan=False)] = (
        0.01
    )

    @pydantic.model_validator(mode='after')
    def bounds(self):
        if self.operator == 'between' and (self.upper is None or self.upper < self.value):
            raise ValueError('between needs ordered bounds')
        return self


class MovementStage(StrictObject):
    id: Identifier
    messages: Messages

    @pydantic.model_validator(mode='after')
    def short_label(self):
        if any(
            len(v) > 32 for v in (self.messages.ru, self.messages.kk, self.messages.en) if v
        ):
            raise ValueError('Movement label exceeds 32 characters')
        return self


class Transition(StrictObject):
    from_: Identifier = pydantic.Field(alias='from')
    to: Identifier
    condition: Condition
    hold_ms: typing.Annotated[int, pydantic.Field(strict=True, ge=100, le=5000)]


class Repetition(StrictObject):
    start_phase: Identifier
    complete_from: Identifier
    complete_to: Identifier
    minimum_duration_ms: typing.Annotated[int, pydantic.Field(strict=True, ge=300, le=30000)]
    maximum_duration_ms: typing.Annotated[int, pydantic.Field(strict=True, ge=500, le=30000)]


class ErrorRule(StrictObject):
    code: Identifier
    evaluate_at: typing.Literal['rep', 'frame']
    condition: Condition
    messages: Messages
    secondary: SecondaryMessages | None = None
    reject_rep: pydantic.StrictBool
    hold_ms: typing.Annotated[int, pydantic.Field(strict=True, ge=100, le=5000)] = 300


class CoachMessages(StrictObject):
    ready: Cue
    good_rep: Cue
    tracking_recovery: Cue
    complete: Cue


class MovementSpecV1(StrictObject):
    version: typing.Literal[1]
    exercise_key: Identifier
    display_name: typing.Annotated[
        str, pydantic.StringConstraints(strict=True, min_length=1, max_length=48)
    ]
    camera: Camera
    calibration: Calibration
    features: typing.Annotated[list[Feature], pydantic.Field(min_length=1, max_length=32)]
    phases: typing.Annotated[list[MovementStage], pydantic.Field(min_length=2, max_length=8)]
    transitions: typing.Annotated[
        list[Transition], pydantic.Field(min_length=2, max_length=32)
    ]
    repetition: Repetition
    error_rules: typing.Annotated[list[ErrorRule], pydantic.Field(max_length=12)]
    coach_messages: CoachMessages

    @pydantic.model_validator(mode='after')
    def graph(self):
        features: set[str] = set()
        for feature in self.features:
            if feature.id in features or not set(feature.inputs) <= features:
                raise ValueError('Features must be unique and ordered without cycles')
            features.add(feature.id)
        phases = {stage.id for stage in self.phases}
        if len(phases) != len(self.phases):
            raise ValueError('Duplicate movement stage')
        if not set(self.calibration.baseline_features) <= features:
            raise ValueError('Unknown baseline feature')
        rep = self.repetition
        if not {rep.start_phase, rep.complete_from, rep.complete_to} <= phases:
            raise ValueError('Unknown repetition stage')
        if rep.complete_to != rep.start_phase or rep.complete_from == rep.complete_to:
            raise ValueError('Repetition must return to its starting stage')
        if rep.minimum_duration_ms >= rep.maximum_duration_ms:
            raise ValueError('Repetition duration bounds are reversed')
        edges: dict[str, set[str]] = {stage: set() for stage in phases}
        for transition in self.transitions:
            if transition.from_ not in phases or transition.to not in phases:
                raise ValueError('Unknown transition stage')
            if (
                transition.from_ == transition.to
                or transition.condition.feature not in features
            ):
                raise ValueError('Invalid transition')
            edges[transition.from_].add(transition.to)
        reachable = {rep.start_phase}
        for _ in phases:
            reachable |= {target for source in reachable for target in edges[source]}
        if reachable != phases or rep.complete_to not in edges[rep.complete_from]:
            raise ValueError('Movement graph lacks a reachable complete cycle')
        if len({rule.code for rule in self.error_rules}) != len(self.error_rules):
            raise ValueError('Duplicate error code')
        if any(rule.condition.feature not in features for rule in self.error_rules):
            raise ValueError('Unknown error feature')
        return self
