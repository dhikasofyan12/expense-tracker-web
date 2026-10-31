import { compactRupiah, niceTicks, rupiah, type CashflowPoint } from "@/lib/finance";
import ui from "../ui.module.css";

const W = 480;
const H = 230;
const PAD = { l: 50, r: 8, t: 10, b: 28 };

/**
 * Grafik batang pemasukan vs pengeluaran dengan label sumbu Y.
 * Harus berada di dalam elemen ber-class `ui.theme` (token warna).
 */
export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const max = data.reduce((m, d) => Math.max(m, d.income, d.expense), 0);
  const { ticks, top } = niceTicks(max);
  const y = (v: number) => PAD.t + plotH - (v / top) * plotH;
  const slot = plotW / Math.max(data.length, 1);
  const bar = Math.min(16, slot / 3.2);

  return (
    <figure className={ui.chart}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grafik pemasukan dan pengeluaran per bulan">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className={ui.gridLine} />
            <text x={PAD.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className={ui.axisText}>
              {compactRupiah(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = PAD.l + slot * i + slot / 2;
          return (
            <g key={d.key}>
              {d.income > 0 && (
                <rect x={cx - bar - 1} y={y(d.income)} width={bar} height={y(0) - y(d.income)} rx={3} className={ui.barIncome}>
                  <title>{`${d.label} · Pemasukan ${rupiah(d.income)}`}</title>
                </rect>
              )}
              {d.expense > 0 && (
                <rect x={cx + 1} y={y(d.expense)} width={bar} height={y(0) - y(d.expense)} rx={3} className={ui.barExpense}>
                  <title>{`${d.label} · Pengeluaran ${rupiah(d.expense)}`}</title>
                </rect>
              )}
              <text x={cx} y={H - 8} textAnchor="middle" className={ui.axisText}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className={ui.legend}>
        <span><i className={ui.dotIncome} />Pemasukan</span>
        <span><i className={ui.dotExpense} />Pengeluaran</span>
      </figcaption>
      <table className={ui.srOnly}>
        <caption>Data arus kas per bulan</caption>
        <thead>
          <tr><th>Bulan</th><th>Pemasukan</th><th>Pengeluaran</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}><td>{d.label}</td><td>{rupiah(d.income)}</td><td>{rupiah(d.expense)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}