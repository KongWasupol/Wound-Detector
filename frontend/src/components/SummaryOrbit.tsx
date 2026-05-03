import type { SummarySnapshot } from "../types.ts";

type Props = {
  data: SummarySnapshot | null;
};

export const SummaryOrbit = ({ data }: Props) => {
  return (
    <section className="panel summary-panel">
      <header>
        <p>Mission Digest</p>
        <h2>Analysis Intelligence Orbit</h2>
      </header>
      <div className="orbit">
        <div className="orbit-core">
          <span>Total scans</span>
          <strong>{data?.totalAnalyses ?? 0}</strong>
        </div>
        <div className="orbit-ring">
          <div>
            <span>Avg severity </span>
            <strong>{data?.averageSeverity ?? 0}</strong>
          </div>
          <div>
            <span>Recent models </span>
            <strong>
              {data?.providerMix?.length
                ? data.providerMix.map((m) => m?.replace("gpt-", "").toUpperCase() || "—").join(" · ")
                : "—"}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
};

