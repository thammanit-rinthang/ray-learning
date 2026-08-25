export default function LessonLoading() {
  return (
    <div className="reading-container" aria-busy="true" aria-label="กำลังโหลดบทเรียน">
      <div className="lesson-loading-toolbar">
        <div className="lesson-loading-heading">
          <div className="skeleton skeleton-kicker" />
          <div className="skeleton skeleton-title" />
        </div>
        <div className="lesson-loading-actions">
          <div className="skeleton skeleton-button" />
          <div className="skeleton skeleton-button" />
        </div>
      </div>
      <div className="lesson-loading-content">
        <div className="skeleton skeleton-line skeleton-line-wide" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line skeleton-line-short" />
        <div className="skeleton skeleton-block" />
      </div>
    </div>
  );
}