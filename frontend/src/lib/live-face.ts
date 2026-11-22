export const captureSteps = [
  {
    pose: 'front',
    label: 'Nhìn thẳng',
    hint: 'Nhìn thẳng vào camera, giữ khuôn mặt trong khung.',
  },
  {
    pose: 'left',
    label: 'Quay nhẹ sang trái',
    hint: 'Quay nhẹ mặt sang trái, vẫn để camera thấy cả hai mắt.',
  },
  {
    pose: 'right',
    label: 'Quay nhẹ sang phải',
    hint: 'Quay nhẹ mặt sang phải, vẫn để camera thấy cả hai mắt.',
  },
] as const;
export type FacePose = (typeof captureSteps)[number]['pose'];
export type FacePreview = {
  acceptable: boolean;
  face_count: number;
  pose: FacePose;
  code: string;
  message: string;
  box: { x: number; y: number; width: number; height: number } | null;
};
export type CaptureProgress = {
  step: number;
  stableFrames: number;
  lastAcceptedAt: number | null;
  missedFrames?: number;
};
export const stableFramesRequired = 3;
export function advanceCapture(
  progress: CaptureProgress,
  preview: FacePreview,
  now: number,
) {
  if (progress.step >= captureSteps.length) return { progress, capture: false };
  const valid =
    preview.acceptable &&
    preview.face_count === 1 &&
    preview.code === 'ready' &&
    preview.pose === captureSteps[progress.step].pose;
  if (!valid) {
    const briefMiss =
      preview.pose === captureSteps[progress.step].pose &&
      ['no_face', 'landmarks_missing'].includes(preview.code) &&
      preview.face_count <= 1 &&
      progress.stableFrames > 0 &&
      (progress.missedFrames || 0) === 0 &&
      progress.lastAcceptedAt !== null &&
      now - progress.lastAcceptedAt <= 2500;
    if (briefMiss)
      return { progress: { ...progress, missedFrames: 1 }, capture: false };
    return {
      progress: {
        ...progress,
        stableFrames: 0,
        lastAcceptedAt: null,
        missedFrames: 0,
      },
      capture: false,
    };
  }
  // A stalled request cannot count towards a continuous hold.
  const continuous =
    progress.lastAcceptedAt !== null && now - progress.lastAcceptedAt <= 4000;
  const stableFrames = continuous ? progress.stableFrames + 1 : 1;
  if (stableFrames >= stableFramesRequired)
    return {
      progress: {
        step: progress.step + 1,
        stableFrames: 0,
        lastAcceptedAt: null,
        missedFrames: 0,
      },
      capture: true,
    };
  return {
    progress: {
      ...progress,
      stableFrames,
      lastAcceptedAt: now,
      missedFrames: continuous ? progress.missedFrames || 0 : 0,
    },
    capture: false,
  };
}
