export function getRegressionLine(dates, ratings, predictionLimit) {

    // Check that all dates are defined
    if (dates.some(date => date === undefined)) {
        throw new Error('One or more dates are undefined');
    }


    let n = dates.length;
    let sum_x = 0;
    let sum_y = 0;
    let sum_xy = 0;
    let sum_xx = 0;

    for (let i = 0; i < dates.length; i++) {
        let x = dates[i].getTime();
        let y = ratings[i];
        sum_x += x;
        sum_y += y;
        sum_xy += (x*y);
        sum_xx += (x*x);
    }

    let slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
    let intercept = (sum_y - slope * sum_x) / n;
    let x1 = dates[0].getTime();

    // Calculate the upper bound of the ratings
    let maxRating = Math.max(...ratings);
    let upperBound = maxRating > 1600 ? maxRating : 1600;
    if (predictionLimit < upperBound) {
        upperBound = predictionLimit;
    }

    // Calculate the future date where the rating reaches the upper bound
    let x2 = (upperBound - intercept) / slope;

    let y1 = slope * x1 + intercept;
    let y2 = slope * x2 + intercept;

    let data = { slope, intercept, x1, y1, x2, y2 };

    console.log('getRegressionLine  data:', data);

    return data;
}