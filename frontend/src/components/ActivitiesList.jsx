import { useEffect, useState, useCallback } from "react";
import {
  getActivities,
  getActivityDetail,
  getAthlete,
  updateActivity,
} from "../api.js";
import {
  formatDistance,
  formatDuration,
  formatDate,
  formatTime,
  formatPace,
} from "../format.js";
import EditModal from "./EditModal.jsx";
import SocialModal from "./SocialModal.jsx";
import SplitsTable from "./SplitsTable.jsx";
import SearchPanel from "./SearchPanel.jsx";

const PER_PAGE = 20;
const SEARCH_FETCH_PAGE_SIZE = 200; // Strava's max per_page
const SEARCH_FETCH_PAGE_CAP = 50; // safety cap: 50 * 200 = 10,000 activities

export default function ActivitiesList({ searchSlot }) {
  const [page, setPage] = useState(1);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasNextPage, setHasNextPage] = useState(false);
  const [gearOptions, setGearOptions] = useState({ bikes: [], shoes: [] });
  const [editingActivity, setEditingActivity] = useState(null);
  const [editLoadingId, setEditLoadingId] = useState(null);
  const [socialActivity, setSocialActivity] = useState(null);
  const [expandedSplitsId, setExpandedSplitsId] = useState(null);
  const [splitsCache, setSplitsCache] = useState({});
  const [splitsLoadingId, setSplitsLoadingId] = useState(null);
  const [splitsError, setSplitsError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allActivities, setAllActivities] = useState(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loadAllError, setLoadAllError] = useState("");
  const [distanceBounds, setDistanceBounds] = useState(null);
  const [distanceRange, setDistanceRange] = useState(null);

  useEffect(() => {
    getAthlete()
      .then((athlete) => {
        setGearOptions({
          bikes: athlete.bikes || [],
          shoes: athlete.shoes || [],
        });
      })
      .catch(() => {
        // Gear list is a nice-to-have; edit still works without it.
      });
  }, []);

  const load = useCallback((pageToLoad) => {
    setLoading(true);
    setError("");
    getActivities(pageToLoad, PER_PAGE)
      .then((data) => {
        setActivities(data);
        setHasNextPage(data.length === PER_PAGE);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const gearNameById = {};
  for (const g of [...gearOptions.bikes, ...gearOptions.shoes]) {
    gearNameById[g.id] = g.name;
  }

  async function handleSave(id, fields) {
    const updated = await updateActivity(id, fields);
    const merge = (a) => (a.id === id ? { ...a, ...updated } : a);
    setActivities((prev) => prev.map(merge));
    if (allActivities) setAllActivities((prev) => prev.map(merge));
  }

  // The activity list Strava returns doesn't include description, so we
  // fetch the full detail record right before editing — otherwise the
  // description field always looks empty even when one exists.
  async function handleEditClick(activity) {
    setEditLoadingId(activity.id);
    try {
      const detail = await getActivityDetail(activity.id);
      const merged = { ...activity, ...detail };
      const merge = (a) => (a.id === activity.id ? merged : a);
      setActivities((prev) => prev.map(merge));
      if (allActivities) setAllActivities((prev) => prev.map(merge));
      setEditingActivity(merged);
    } catch (err) {
      setError(err.message || "Couldn't load activity details");
    } finally {
      setEditLoadingId(null);
    }
  }

  async function handleToggleSplits(activity) {
    if (expandedSplitsId === activity.id) {
      setExpandedSplitsId(null);
      return;
    }
    setExpandedSplitsId(activity.id);
    setSplitsError("");
    if (splitsCache[activity.id]) return;

    setSplitsLoadingId(activity.id);
    try {
      const detail = await getActivityDetail(activity.id);
      setSplitsCache((prev) => ({ ...prev, [activity.id]: detail.splits_metric || [] }));
    } catch (err) {
      setSplitsError(err.message || "Couldn't load splits");
    } finally {
      setSplitsLoadingId(null);
    }
  }

  async function handleShare(activity) {
    const url = `https://www.strava.com/activities/${activity.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: activity.name, url });
      } catch {
        // user cancelled the share sheet — no error needed
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(activity.id);
      setTimeout(() => setCopiedId((id) => (id === activity.id ? null : id)), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  // Strava has no server-side name/distance search, so searching "your
  // entire history" means fetching everything once (in 200-at-a-time
  // batches) and filtering client-side from then on.
  async function fetchAllActivities() {
    setLoadingAll(true);
    setLoadAllError("");
    setLoadedCount(0);
    const collected = [];
    try {
      for (let p = 1; p <= SEARCH_FETCH_PAGE_CAP; p++) {
        const batch = await getActivities(p, SEARCH_FETCH_PAGE_SIZE);
        collected.push(...batch);
        setLoadedCount(collected.length);
        if (batch.length < SEARCH_FETCH_PAGE_SIZE) break;
      }
      setAllActivities(collected);
      if (collected.length > 0) {
        const distancesKm = collected.map((a) => (a.distance || 0) / 1000);
        const min = Math.floor(Math.min(...distancesKm));
        const max = Math.ceil(Math.max(...distancesKm));
        setDistanceBounds([min, max]);
        setDistanceRange([min, max]);
      } else {
        setDistanceBounds([0, 0]);
        setDistanceRange([0, 0]);
      }
    } catch (err) {
      setLoadAllError(err.message || "Couldn't load activity history");
    } finally {
      setLoadingAll(false);
    }
  }

  function handleToggleSearch() {
    const next = !searchOpen;
    setSearchOpen(next);
    if (next && allActivities === null && !loadingAll) {
      fetchAllActivities();
    }
  }

  const searching = searchOpen && allActivities !== null;
  const filteredActivities = searching
    ? allActivities.filter((a) => {
        const matchesName =
          !searchQuery.trim() ||
          (a.name || "").toLowerCase().includes(searchQuery.trim().toLowerCase());
        const km = (a.distance || 0) / 1000;
        const matchesDistance =
          !distanceRange || (km >= distanceRange[0] && km <= distanceRange[1]);
        return matchesName && matchesDistance;
      })
    : [];

  const displayedActivities = searching ? filteredActivities : activities;

  function renderRow(activity) {
    return (
      <div key={activity.id}>
        <div className="activity-row">
          <span className="type-tag">{activity.sport_type || activity.type}</span>
          <div className="activity-main">
            <p className="name">{activity.name}</p>
            <p className="activity-datetime">
              {formatDate(activity.start_date_local)} ·{" "}
              {formatTime(activity.start_date_local)}
            </p>

            <div className="core-stats">
              <span className="stat-item">{formatDistance(activity.distance)}</span>
              <span className="stat-item">
                <span className="stat-sep">|</span>{formatDuration(activity.moving_time)}
              </span>
              <span className="stat-item">
                <span className="stat-sep">|</span>{formatPace(activity.average_speed)}/km
              </span>
              {activity.average_heartrate && (
                <span className="stat-item">
                  <span className="stat-sep">|</span>
                  {Math.round(activity.average_heartrate)} bpm
                </span>
              )}
            </div>

            {activity.gear_id && (
              <p className="gear-line">{gearNameById[activity.gear_id] || activity.gear_id}</p>
            )}
            {activity.description && <p className="description">{activity.description}</p>}

            <div className="action-row">
              <button
                type="button"
                className="social-trigger"
                onClick={() => setSocialActivity(activity)}
              >
                ♥ {activity.kudos_count ?? 0} · 💬 {activity.comment_count ?? 0}
              </button>
              <button
                type="button"
                className="icon-trigger"
                title={expandedSplitsId === activity.id ? "Hide splits" : "Splits"}
                onClick={() => handleToggleSplits(activity)}
              >
                📊
              </button>
              <button
                type="button"
                className="icon-trigger"
                title="Share"
                onClick={() => handleShare(activity)}
              >
                🔗
              </button>
            </div>
            {copiedId === activity.id && <p className="copy-toast">Link copied</p>}
          </div>
          <div className="row-actions">
            <button
              className="edit-icon-btn"
              title="Edit"
              onClick={() => handleEditClick(activity)}
              disabled={editLoadingId === activity.id}
            >
              {editLoadingId === activity.id ? (
                <span className="edit-spinner" />
              ) : (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {expandedSplitsId === activity.id && (
          <div className="splits-wrap">
            {splitsLoadingId === activity.id && (
              <div className="splits-empty">Loading splits…</div>
            )}
            {splitsError && splitsLoadingId !== activity.id && (
              <div className="error-text">{splitsError}</div>
            )}
            {splitsCache[activity.id] && splitsLoadingId !== activity.id && (
              <SplitsTable splits={splitsCache[activity.id]} />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <SearchPanel
        open={searchOpen}
        onToggle={handleToggleSearch}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        loading={loadingAll}
        loadedCount={loadedCount}
        error={loadAllError}
        bounds={distanceBounds}
        range={distanceRange}
        onRangeChange={setDistanceRange}
        resultCount={filteredActivities.length}
        slot={searchSlot}
      />

      {!searching && loading && (
        <div className="loading-state">Loading activities…</div>
      )}
      {error && <div className="error-text">{error}</div>}

      {!loading && !error && displayedActivities.length === 0 && (
        <div className="empty-state">
          {searching ? "No activities match your search." : "No activities on this page."}
        </div>
      )}

      {displayedActivities.length > 0 && (
        <div className="ledger">{displayedActivities.map(renderRow)}</div>
      )}

      {!searching && (
        <div className="pagination">
          <button
            className="btn btn-ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            ← Prev
          </button>
          <span className="page-label">Page {page}</span>
          <button
            className="btn btn-ghost"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNextPage || loading}
          >
            Next →
          </button>
        </div>
      )}

      {editingActivity && (
        <EditModal
          activity={editingActivity}
          gearOptions={gearOptions}
          onClose={() => setEditingActivity(null)}
          onSave={handleSave}
        />
      )}

      {socialActivity && (
        <SocialModal activity={socialActivity} onClose={() => setSocialActivity(null)} />
      )}
    </div>
  );
}
