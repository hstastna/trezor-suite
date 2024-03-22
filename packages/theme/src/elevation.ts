export type Elevation =
    | -2 // we need this to be able to create elevation -1 (it is wrapped inside of the -2 via ElevationContext)
    | -1 // For example: side-bar
    | 0
    | 1
    | 2
    | 3;

export const nextElevation: Record<Elevation, Elevation> = {
    '-2': -1,
    '-1': 0,
    0: 1,
    1: 2,
    2: 3,
    // We intentionally never cycle. Higher elevations shall not be visible to the user.
    3: 3,
};
