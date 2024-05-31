/*
Glo Rating System

Details about the algorithm can be found here:
https://github.com/ABNiels/glo/blob/main/README.md
*/

const K_HOLE = 35;
const K_PLAYER_DEFAULT = 12;
const R_WEIGHT = 0.2;
const RD = 360;

/* Convert strokes (-inf, inf) to score (0, 1) */
function toScore(strokes: number): number {
    // Could just use a lookup table if no use case for converting float strokes
    return 1 / (1 + Math.pow(10, strokes / 2));
}

/* Convert score (0, 1) to strokes (-inf, inf) */
function toStrokes(score: number): number {
    return 2 * Math.log10((1 - score) / score);
}

/* Calculate expected score (0, 1) */
function calcExpectedScore(holeRating: number, playerRating: number): number {
    return 1 / (1 + Math.pow(10, (holeRating - playerRating) / RD));
}

interface PerformanceRatingData {
    holeRatings: number[];
    totalScore: number;
    minReturn?: number;
    maxReturn?: number;
    iterations?: number;
}
/* Calculate performance rating (minReturn, maxReturn) */
function calcPerformanceRating(data: PerformanceRatingData): number {
    const iterations = data.iterations ?? 8;
    const maxReturn = data.maxReturn ?? 3000;
    const minReturn = data.minReturn ?? 0;

    let sum = 0;
    let offset = (maxReturn - minReturn) / 2;
    let performanceRating = minReturn + offset;

    // TODO: tolerance instead of iterations?
    for (let i = 0; i < iterations; i++) {
        offset /= 2;
        sum = 0;
        for (const holeRating of data.holeRatings) {
            sum += calcExpectedScore(holeRating, performanceRating);
        }
        if (sum < data.totalScore) {
            performanceRating += offset;
        } else if (sum > data.totalScore) {
            performanceRating -= offset;
        } else {
            // Unlikely
            return performanceRating;
        }
        // TODO: Add tolerance for early return near min/max
    }
    return performanceRating;
}

/* Weighted average of playerRating and performanceRating */
function modifyPlayerRating(playerRating: number, performanceRating: number): number {
    return playerRating + R_WEIGHT * (performanceRating - playerRating);
}

/* Adjust hole rating based on details */
function modifyHoleRating(holeRating: number, details?: number[]): number {
    // TODO: Decide what conditions/values to apply
    return holeRating;
}

/* Calculate player K factor  [12, inf] */
function calcPlayerKFactor(playerRating: number): number {
    // TODO: Optimize/rework this equation
    if (playerRating < 1900) {
        return 16 * Math.sqrt(0.5625 + Math.pow(1900 - playerRating, 2) / 250000);
    }
    return K_PLAYER_DEFAULT;
}

interface RatingResult {
    playerRating: number;
    holeRating: number;
}
interface RatingData {
    playerRating: number;
    holeRating: number;
    strokes: number;
    performanceRating?: number;
}
/* Calculate new player and hole ratings */
function calcRatingUpdates(data: RatingData): RatingResult {
    const performanceRating = data.performanceRating ?? 0;

    const modifiedHoleRating = modifyHoleRating(data.holeRating);
    const modifiedPlayerRating = modifyPlayerRating(data.playerRating, performanceRating);

    const expectedScore = calcExpectedScore(modifiedHoleRating, modifiedPlayerRating);
    const actualScore = toScore(data.strokes);

    const playerKFactor = calcPlayerKFactor(data.playerRating);

    const newPlayerRating = data.playerRating + playerKFactor * (actualScore - expectedScore);
    const newHoleRating = data.holeRating + K_HOLE * (expectedScore - actualScore);

    return { playerRating: newPlayerRating, holeRating: newHoleRating };
}
