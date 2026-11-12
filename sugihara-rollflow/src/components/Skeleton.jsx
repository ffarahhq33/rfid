import React from "react";

// A placeholder block shaped like the content that is loading.
export function Skeleton({ w = "100%", h = "1rem", r, style, className = "" }) {
  return (
    <span
      className={"skeleton " + className}
      style={{ width: w, height: h, borderRadius: r, ...style }}
      aria-hidden="true"
    />
  );
}

const Lines = ({ widths }) => (
  <div className="skeleton-lines">
    {widths.map((w, i) => (
      <Skeleton key={i} w={w} h="0.875rem" />
    ))}
  </div>
);

function KpiRow({ count = 4 }) {
  return (
    <div className={"kpi-grid" + (count === 3 ? " three" : "")}>
      {Array.from({ length: count }, (_, i) => (
        <div className="kpi" key={i}>
          <Skeleton w="55%" h="0.8125rem" />
          <Skeleton w="35%" h="2rem" style={{ marginTop: "0.5rem" }} />
        </div>
      ))}
    </div>
  );
}

function Heading({ title = "9rem", subtitle }) {
  return (
    <div className="card-heading">
      <div>
        <Skeleton w={title} h="1.1rem" />
        {subtitle && (
          <Skeleton w={subtitle} h="0.8rem" style={{ marginTop: "0.5rem" }} />
        )}
      </div>
    </div>
  );
}

function Table({ rows = 4, filters = false }) {
  return (
    <>
      {filters && (
        <div className="filters">
          <Skeleton w="100%" h="var(--control-h)" r="var(--radius-md)" />
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {Array.from({ length: 5 }, (_, i) => (
                <th key={i}>
                  <Skeleton w="4rem" h="0.6rem" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <td>
                  <Skeleton w="9rem" h="0.8rem" />
                  <Skeleton w="7rem" h="0.65rem" style={{ marginTop: "0.4rem" }} />
                </td>
                <td>
                  <Skeleton w="3.5rem" h="0.8rem" />
                </td>
                <td>
                  <Skeleton w="3rem" h="0.8rem" />
                </td>
                <td>
                  <Skeleton w="4rem" h="0.8rem" />
                </td>
                <td>
                  <Skeleton w="4.5rem" h="1.25rem" r="var(--radius-full)" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const TableCard = (props) => (
  <section className="card">
    <Heading title="10rem" subtitle={props.subtitle && "16rem"} />
    <Table {...props} />
  </section>
);

const Block = ({ h }) => (
  <Skeleton
    h={h}
    r="var(--radius-lg)"
    style={{ display: "block", marginBottom: "var(--space-5)" }}
  />
);

// Mirrors the layout of each page so nothing jumps when the data arrives.
export function PageSkeleton({ page }) {
  let body;
  if (page === 0)
    body = (
      <>
        <Block h="11.5rem" />
        <KpiRow />
        <div className="dashboard-grid">
          <section className="card">
            <Heading />
            <div className="skeleton-pad">
              <Lines widths={["100%", "100%", "70%"]} />
            </div>
          </section>
          <section className="card">
            <Heading title="8rem" />
            <div className="skeleton-pad">
              <Lines widths={["100%", "85%"]} />
            </div>
          </section>
        </div>
        <section className="card">
          <Heading title="9rem" />
          <div className="skeleton-pad">
            <Lines widths={["100%", "100%", "100%"]} />
          </div>
        </section>
      </>
    );
  else if (page === 1)
    body = (
      <>
        <Block h="13rem" />
        <section className="card">
          <Heading subtitle="14rem" />
          <div className="form-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton-field">
                <Skeleton w="6rem" h="0.8rem" />
                <Skeleton h="var(--control-h)" r="var(--radius-md)" />
              </div>
            ))}
          </div>
        </section>
        <TableCard rows={4} filters />
      </>
    );
  else if (page === 2)
    body = (
      <>
        <KpiRow count={3} />
        <TableCard rows={5} filters />
      </>
    );
  else if (page === 5)
    body = (
      <>
        <div className="tabs">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} w="9rem" h="var(--control-h)" r="var(--radius-md)" />
          ))}
        </div>
        <div className="kanban">
          {[0, 1, 2, 3].map((i) => (
            <section className="card" key={i}>
              <Heading title="4rem" />
              <div className="skeleton-pad">
                <Skeleton w="3.5rem" h="2rem" />
                <Skeleton h="6px" style={{ marginTop: "1rem" }} />
              </div>
            </section>
          ))}
        </div>
        <TableCard rows={3} filters />
      </>
    );
  else if (page === 7)
    body = (
      <>
        <TableCard rows={6} filters />
        <TableCard rows={4} />
      </>
    );
  else if (page === 8)
    body = (
      <>
        <section className="card">
          <Heading subtitle="14rem" />
          <div className="form-grid">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton-field">
                <Skeleton w="8rem" h="0.8rem" />
                <Skeleton h="var(--control-h)" r="var(--radius-md)" />
              </div>
            ))}
          </div>
        </section>
        <div className="dashboard-grid">
          {[0, 1].map((i) => (
            <section className="card" key={i}>
              <Heading />
              <div className="skeleton-pad">
                <Lines widths={["100%", "100%"]} />
              </div>
            </section>
          ))}
        </div>
      </>
    );
  else
    body = (
      <>
        <Block h="9rem" />
        <TableCard rows={3} />
        <TableCard rows={4} />
      </>
    );
  return (
    <div className="page-skeleton" role="status" aria-busy="true">
      <span className="sr-only">Loading records…</span>
      {body}
    </div>
  );
}
