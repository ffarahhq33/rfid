import React from "react";

// A placeholder block shaped like the content that is loading.
export function Skeleton({ w = "100%", h = "1rem", r, style }) {
  return (
    <span
      className="skeleton"
      style={{ width: w, height: h, borderRadius: r, ...style }}
      aria-hidden="true"
    />
  );
}

// Mirrors the overview layout so nothing jumps when the data arrives.
export function DashboardSkeleton() {
  return (
    <div className="page-skeleton" role="status" aria-busy="true">
      <span className="sr-only">Loading RFID dashboard…</span>
      <div className="kpi-grid">
        {[0, 1, 2, 3].map((i) => (
          <div className="kpi-card" key={i}>
            <Skeleton w="50%" h="0.8125rem" />
            <Skeleton w="35%" h="2rem" style={{ marginTop: "0.5rem" }} />
          </div>
        ))}
      </div>
      <section className="section-card">
        <div className="section-head">
          <Skeleton w="10rem" h="1.1rem" />
        </div>
        <div className="section-body">
          <Skeleton h="6rem" r="var(--radius-md)" />
        </div>
      </section>
      <section className="section-card">
        <div className="section-head">
          <Skeleton w="9rem" h="1.1rem" />
        </div>
        <div className="section-body">
          <table className="data-table">
            <thead>
              <tr>
                {[0, 1, 2, 3, 4].map((i) => (
                  <th key={i}>
                    <Skeleton w="4rem" h="0.6rem" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3].map((r) => (
                <tr key={r}>
                  <td>
                    <Skeleton w="9rem" h="0.8rem" />
                    <Skeleton w="6rem" h="0.65rem" style={{ marginTop: "0.4rem" }} />
                  </td>
                  <td>
                    <Skeleton w="3.5rem" h="0.8rem" />
                  </td>
                  <td>
                    <Skeleton w="3.5rem" h="0.8rem" />
                  </td>
                  <td>
                    <Skeleton w="4.5rem" h="1.25rem" r="var(--radius-full)" />
                  </td>
                  <td>
                    <Skeleton w="7rem" h="0.8rem" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
