/**
 * P4: backend now computes stats from DB. Frontend just sends IDs.
 *
 * (Pre-P4 used to ship perClass / nodePassRates etc; backend now ignores those
 * extra fields, so we simply stop sending them.)
 */

export function buildGradeSummaryPayload(quizId /*, _quizTitle, _classes */) {
  return { quizId };
}

export function buildClassSummaryPayload(quizId, _quizTitle, cls) {
  return { quizId, classId: cls.id };
}
