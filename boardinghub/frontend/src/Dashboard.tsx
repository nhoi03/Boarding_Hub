import { Card, Tag, Tooltip } from 'antd';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Building2, CalendarDays, ClipboardList,
  DoorOpen, Droplets, Receipt, Users, Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { invoiceStatus, money, useDemo } from './demo';

export default function Dashboard() {
  const { demo } = useDemo();
  const total = demo.rooms.length;
  const occupied = demo.rooms.filter(room => room.status === 'OCCUPIED').length;
  const vacant = demo.rooms.filter(room => room.status === 'AVAILABLE').length;
  const occupancy = [
    { label: 'Đang cho thuê', value: occupied, icon: Users, tone: 'green' },
    { label: 'Phòng trống', value: vacant, icon: DoorOpen, tone: 'blue' },
    { label: 'Đang bảo trì', value: demo.rooms.filter(room => room.status === 'MAINTENANCE').length, icon: Wrench, tone: 'amber' },
  ] as const;
  const metrics = [{ label: 'Tổng số phòng', value: total, icon: Building2, tone: 'violet' }, ...occupancy];
  const occupiedPercent = total ? occupied / total * 100 : 0;
  const occupiedLabel = occupiedPercent.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  const vacancyEnd = total ? (occupied + vacant) / total * 100 : 0;
  const receipts = demo.invoices.flatMap(invoice => invoice.receipts);
  const revenue = [6, 7, 8, 9, 10, 11].map(month => receipts.filter(receipt =>
    receipt.date.startsWith(`2026-${String(month).padStart(2, '0')}`)).reduce((sum, receipt) => sum + receipt.amount, 0));
  const chartMax = Math.max(4, Math.ceil(Math.max(...revenue) / 4000000) * 4);
  const readings = demo.modules.meters?.filter(reading => reading.period === '2026-11') ?? [{ room: 'A101' }];
  const tasks = [
    { label: 'Phòng cần ghi chỉ số', count: `${demo.rooms.filter(room => room.status === 'OCCUPIED' && !readings.some(reading => reading.room === room.roomNumber)).length} phòng`, path: '/utilities', icon: Droplets, tone: 'blue' },
    { label: 'Hóa đơn quá hạn', count: `${demo.invoices.filter(invoice => invoiceStatus(invoice) === 'Quá hạn').length} hóa đơn`, path: '/invoices', icon: Receipt, tone: 'rose' },
    { label: 'Yêu cầu xem phòng mới', count: `${demo.inquiries.filter(inquiry => inquiry.status === 'Mới').length} yêu cầu`, path: '/listings', icon: CalendarDays, tone: 'amber' },
    { label: 'Bảo trì cần xử lý', count: `${demo.requests.filter(request => request.type === 'Báo hỏng' && request.status !== 'Đã hoàn thành').length} yêu cầu`, path: '/maintenance', icon: Wrench, tone: 'violet' },
  ] as const;

  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <h1>Tổng quan</h1>
          <p>Tình trạng cho thuê, thực thu và công việc cần xử lý.</p>
        </div>
        <div className="page-heading-actions">
          <Tag className="demo-tag" color="purple">Dữ liệu minh họa</Tag>
          <span className="period-label"><CalendarDays size={15} /> Tháng 11/2026</span>
        </div>
      </div>

      <section className="dashboard-hero" aria-labelledby="occupancy-headline">
        <div className="hero-copy">
          <h2 id="occupancy-headline">Tỷ lệ lấp đầy <span>{occupiedLabel}%</span></h2>
          <p>{occupied} trong tổng số {total} phòng đang cho thuê.</p>
          <Link to="/rooms" className="hero-link">Xem danh sách phòng <ArrowRight size={16} /></Link>
        </div>
      </section>

      <div className="metrics-grid">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="metric-card">
            <span className={`icon-tile tone-${tone}`}><Icon size={20} /></span>
            <div className="metric-copy">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          </Card>
        ))}
      </div>

      <div className="dashboard-grid">
        <Card className="dashboard-card revenue-card">
          <div className="card-heading">
            <div>
              <h2>Tiền thuê và dịch vụ đã thu</h2>
              <p>Tháng 6 – 11/2026 · Triệu đồng</p>
            </div>
            <Link className="quiet-link" to="/reports">Báo cáo <ArrowUpRight size={15} /></Link>
          </div>
          <div className="revenue-chart" aria-label="Tiền đã thu theo tháng, đơn vị triệu đồng">
            <div className="chart-scale" aria-hidden="true">
              {[1, .75, .5, .25, 0].map(tick => <span key={tick}>{tick * chartMax}</span>)}
            </div>
            <div className="chart-grid" aria-hidden="true"><i /><i /><i /><i /><i /></div>
            <div className="chart-bars">
              {revenue.map((value, index) => (
                <div className="chart-column" key={index}>
                  <Tooltip title={`Tháng ${index + 6}: ${money(value)}`}>
                    <div
                      className={`chart-bar${index === revenue.length - 1 ? ' chart-bar-current' : ''}`}
                      style={{ height: `${Math.max(value / (chartMax * 10000), .8)}%` }}
                      tabIndex={0}
                      role="img"
                      aria-label={`Tháng ${index + 6}: ${money(value)}`}
                    />
                  </Tooltip>
                </div>
              ))}
            </div>
            <div className="chart-months" aria-hidden="true">
              {revenue.map((_, index) => <span key={index}>T{index + 6}</span>)}
            </div>
          </div>
        </Card>

        <Card className="dashboard-card occupancy-card">
          <div className="card-heading">
            <div><h2>Tình trạng phòng</h2><p>Phân bổ trên {total} phòng</p></div>
            <Link className="icon-link" to="/rooms" aria-label="Mở danh sách phòng"><ArrowUpRight size={17} /></Link>
          </div>
          <div className="occupancy-content">
            <div
              className="occupancy-ring"
              style={{ background: `conic-gradient(var(--ring-green) ${occupiedPercent}%, var(--ring-blue) 0 ${vacancyEnd}%, var(--ring-amber) 0)` }}
              aria-hidden="true"
            >
              <div><strong>{total}</strong><span>phòng</span></div>
            </div>
            <ul className="occupancy-legend">
              {occupancy.map(({ label, value, tone }) => (
                <li key={label}><span className={`status-dot tone-${tone}`} />{label}<strong>{value}</strong></li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <Card className="dashboard-card tasks-card">
        <div className="card-heading">
          <div><h2>Công việc cần xử lý</h2></div>
          <ClipboardList size={19} className="card-heading-icon" />
        </div>
        <ul className="tasks-list">
          {tasks.map(({ label, count, path, icon: Icon, tone }) => (
            <li key={path}>
              <Link to={path}>
                <span className={`icon-tile tone-${tone}`}><Icon size={17} /></span>
                <span>{label}<small>{count}</small></span>
                <ArrowDownRight size={16} className="task-arrow" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
