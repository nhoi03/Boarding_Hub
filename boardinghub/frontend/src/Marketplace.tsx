import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BedDouble, CalendarDays, Check,
  CircleCheck, House, KeyRound, MapPin, Maximize, MessageCircle, Search, SlidersHorizontal, Users, Wallet,
} from 'lucide-react';
import { Link, NavLink, useParams } from 'react-router-dom';
import {
  districts, formatAppointment, matchText, money, publicListings, roomPhotos, roomTypes, sampleId, useDemo,
} from './demo';
import type { Inquiry, Listing } from './demo';
import { Blank, Brand, FormDialog, Status, ThemeButton } from './ui';
import type { Field, ThemeControls } from './ui';
import hero from './assets/rental-hero.webp';
import { accountHome, useAuth } from './auth';

const budgets = [
  { value: '0-3000000', label: 'Dưới 3 triệu' },
  { value: '3000000-4000000', label: 'Từ 3 đến dưới 4 triệu' },
  { value: '4000000-5000000', label: 'Từ 4 đến dưới 5 triệu' },
  { value: '5000000-Infinity', label: 'Từ 5 triệu' },
];

export function PublicHeader(controls: ThemeControls) {
  const { user } = useAuth();
  return (
    <header className="public-header">
      <div className="public-container public-navigation">
        <Brand />
        <nav aria-label="Điều hướng công khai">
          <NavLink to="/" end><Search size={16} /> Khám phá phòng</NavLink>
          <NavLink to="/lich-xem"><CalendarDays size={16} /> Yêu cầu của tôi</NavLink>
        </nav>
        <div className="public-account">
          <Link className="public-owner-link" to={user?.role === 'ADMIN' ? '/admin' : user?.role === 'OWNER' ? '/dashboard' : '/login?role=owner'}>{user?.role === 'ADMIN' ? 'Quản trị' : 'Dành cho chủ trọ'}</Link>
          <ThemeButton {...controls} />
          <Link className="ui-button primary" to={user ? accountHome(user) : '/login'}><KeyRound size={16} />{user ? 'Không gian của tôi' : 'Đăng nhập'}</Link>
        </div>
      </div>
    </header>
  );
}

function PublicFooter() {
  return <footer className="public-footer"><div className="public-container">
    <Brand />
    <small>Dữ liệu và hình ảnh minh họa</small>
    <div><Link to="/login?role=tenant">Dành cho người thuê</Link><Link to="/login?role=owner">Dành cho chủ trọ <ArrowUpRight size={14} /></Link></div>
  </div></footer>;
}

export function Marketplace({ controls }: { controls: ThemeControls }) {
  const { demo } = useDemo();
  const [filters, setFilters] = useState({ location: '', budget: '', type: '' });
  const [applied, setApplied] = useState(filters);
  const [order, setOrder] = useState('featured');
  const [min = 0, max = Infinity] = applied.budget ? applied.budget.split('-').map(Number) : [];
  const listings = publicListings(demo).filter(listing => matchText(`${listing.district} ${listing.address} ${listing.title}`, applied.location)
    && listing.price >= min && listing.price < max && (!applied.type || listing.type === applied.type));
  if (order !== 'featured') listings.sort((a, b) => order === 'low' ? a.price - b.price : b.price - a.price);
  const hasFilter = Boolean(applied.location || applied.budget || applied.type);

  return (
    <div className="public-shell">
      <PublicHeader {...controls} />
      <main className="public-container marketplace">
        <section className="find-hero" aria-labelledby="find-title">
          <div className="find-hero-copy">
            <span className="find-city"><MapPin size={15} /> HÀ NỘI</span>
            <h1 id="find-title">Tìm phòng trọ<br /><em>hợp với bạn.</em></h1>
            <p>Lọc theo khu vực và ngân sách. Chọn phòng bạn thích rồi hẹn lịch đến xem.</p>
          </div>
          <div className="find-hero-photo"><img src={hero} alt="Studio sáng với cửa mở ra ban công và bộ sofa màu kem" fetchPriority="high" /></div>
          <form className="find-form" role="search" onSubmit={event => {
            event.preventDefault();
            setApplied(filters);
            document.getElementById('ket-qua')?.scrollIntoView({ block: 'start' });
          }}>
            <label><MapPin size={20} /><span><strong>Khu vực</strong><input placeholder="Quận, phường" value={filters.location} onChange={event => setFilters({ ...filters, location: event.target.value })} /></span></label>
            <label><Wallet size={20} /><span><strong>Mức giá</strong><select value={filters.budget} onChange={event => setFilters({ ...filters, budget: event.target.value })}>
              <option value="">Mọi mức giá</option>{budgets.map(budget => <option key={budget.value} value={budget.value}>{budget.label}</option>)}
            </select></span></label>
            <label><House size={20} /><span><strong>Loại phòng</strong><select value={filters.type} onChange={event => setFilters({ ...filters, type: event.target.value })}>
              <option value="">Tất cả loại phòng</option>{roomTypes.map(type => <option key={type}>{type}</option>)}
            </select></span></label>
            <button type="submit" className="ui-button primary"><Search size={19} /> Tìm phòng</button>
          </form>
        </section>
        <section className="listing-section" id="ket-qua" aria-labelledby="listing-heading">
          <div className="listing-head">
            <div><h2 id="listing-heading">{hasFilter ? 'Kết quả tìm phòng' : 'Phòng trống'}</h2><p aria-live="polite">{listings.length} phòng {hasFilter ? 'phù hợp' : 'tại Hà Nội'}</p></div>
            <label className="sort-field"><SlidersHorizontal size={16} /><select aria-label="Sắp xếp tin phòng" value={order} onChange={event => setOrder(event.target.value)}>
              <option value="featured">Gợi ý</option><option value="low">Giá thấp đến cao</option><option value="high">Giá cao đến thấp</option>
            </select></label>
          </div>
          <div className="district-filters" aria-label="Lọc nhanh theo khu vực">
            {['', ...districts].map(district => <button type="button" key={district} aria-pressed={applied.location === district} onClick={() => {
              setFilters({ ...applied, location: district });
              setApplied({ ...applied, location: district });
            }}>{district || 'Tất cả khu vực'}</button>)}
          </div>
          {listings.length ? <div className="listing-grid">{listings.map(listing => <ListingCard key={listing.id} listing={listing} />)}</div> :
            <div className="product-panel result-empty"><Blank title="Không tìm thấy phòng phù hợp." description="Thử một khu vực hoặc mức giá khác." />
              <button type="button" className="ui-button" onClick={() => {
                const reset = { location: '', budget: '', type: '' };
                setFilters(reset);
                setApplied(reset);
              }}>Xóa bộ lọc</button></div>}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  return <article className="listing-card">
    <Link to={`/tim-phong/${listing.id}`} aria-label={`Xem ${listing.title}`} className="listing-photo">
      <img src={roomPhotos[listing.photo]} alt={listing.title} loading="lazy" />
      <span><i /> Còn phòng</span>
    </Link>
    <div className="listing-card-body">
      <div className="listing-type">{listing.type}</div>
      <h3><Link to={`/tim-phong/${listing.id}`}>{listing.title}</Link></h3>
      <p className="listing-location"><MapPin size={15} /> {listing.address}</p>
      <div className="listing-facts"><span><Maximize size={16} /> {listing.area} m²</span><span><Users size={17} /> Tối đa {listing.capacity} người</span></div>
      <div className="listing-card-bottom">
        <div><strong>{money(listing.price)}</strong><small> / tháng</small></div>
        <Link to={`/tim-phong/${listing.id}`} className="listing-arrow" aria-label={`Xem chi tiết ${listing.title}`}><ArrowUpRight size={19} /></Link>
      </div>
    </div>
  </article>;
}

export function ListingDetail({ controls }: { controls: ThemeControls }) {
  const { id } = useParams();
  const { demo, change } = useDemo();
  const listing = publicListings(demo).find(entry => entry.id === id);
  const [form, setForm] = useState<'visit' | 'contact'>();
  const [receipt, setReceipt] = useState<string>();

  const fields: Field[] = [
    { key: 'name', label: 'Họ và tên', maxLength: 100 },
    { key: 'phone', label: 'Số điện thoại', type: 'tel', maxLength: 20 },
    ...(form === 'visit' ? [{ key: 'appointment', label: 'Ngày giờ muốn xem', type: 'datetime-local', multiline: true, hint: 'Giờ Việt Nam (GMT+7)' } as const] : []),
    { key: 'note', label: 'Lời nhắn', type: 'textarea', required: false },
  ];

  function save(values: Record<string, string>) {
    if (!listing) return 'Tin phòng này đã đóng.';
    if (!/^(?:\+84|0)\d{9}$/.test(values.phone.replace(/[ .-]/g, ''))) return 'Nhập số điện thoại Việt Nam hợp lệ.';
    if (values.appointment && Date.parse(`${values.appointment}+07:00`) <= Date.now()) return 'Chọn ngày giờ sau thời điểm hiện tại.';
    const inquiry: Inquiry = { id: sampleId('LH'), listingId: listing.id, listingTitle: listing.title, name: values.name, phone: values.phone, note: values.note, appointment: values.appointment ?? '', status: 'Mới' };
    change(previous => ({ ...previous, inquiries: [inquiry, ...previous.inquiries], viewedInquiries: [inquiry.id, ...previous.viewedInquiries] }));
    setReceipt(inquiry.id);
  }

  return <div className="public-shell"><PublicHeader {...controls} />
    <main className="public-container public-inner">
      <Link to="/" className="back-link"><ArrowLeft size={16} /> Tất cả phòng</Link>
      {listing ? <>
        <div className="listing-detail-head"><span className="listing-type">{listing.type}</span><h1>{listing.title}</h1><p className="listing-location"><MapPin size={17} /> {listing.address}</p></div>
        <div className="listing-detail-grid">
          <div className="listing-detail-main">
            <img src={roomPhotos[listing.photo]} alt={listing.title} />
            <section className="product-panel"><h2>Thông tin phòng</h2><p>{listing.description}</p>
              <div className="listing-facts"><span><Maximize size={18} /> {listing.area} m²</span><span><Users size={18} /> Tối đa {listing.capacity} người</span><span><BedDouble size={18} /> {listing.type}</span></div>
            </section>
            <section className="product-panel"><h2>Tiện ích</h2><ul className="amenity-list">{listing.amenities.map(amenity => <li key={amenity}><Check size={17} /> {amenity}</li>)}</ul></section>
          </div>
          <aside className="product-panel detail-contact">
            <Status>Đang công bố</Status>
            <p>Giá thuê mỗi tháng</p><strong>{money(listing.price)}</strong>
            <button type="button" className="ui-button primary" onClick={() => setForm('visit')}><CalendarDays size={18} /> Đề nghị lịch xem</button>
            <button type="button" className="ui-button" onClick={() => setForm('contact')}><MessageCircle size={18} /> Liên hệ chủ trọ</button>
            {receipt && <div className="inline-success" role="status"><CircleCheck size={17} /><div>Đã lưu yêu cầu mẫu <b>{receipt}</b>.<Link to="/lich-xem">Xem trạng thái <ArrowRight size={14} /></Link></div></div>}
          </aside>
        </div>
        {form && <FormDialog title={form === 'visit' ? 'Đề nghị lịch xem' : 'Liên hệ chủ trọ'} fields={fields} submit="Gửi yêu cầu" close={() => setForm(undefined)} save={save} intro="Yêu cầu mẫu được lưu trong trình duyệt này. Hãy dùng thông tin liên hệ giả để thử." />}
      </> : <div className="product-panel"><Blank title="Tin phòng hiện không còn công khai." /></div>}
    </main><PublicFooter /></div>;
}

export function ViewingRequests({ controls }: { controls: ThemeControls }) {
  const { demo } = useDemo();
  const entries = demo.inquiries.filter(inquiry => demo.viewedInquiries.includes(inquiry.id));
  return <div className="public-shell"><PublicHeader {...controls} /><main className="public-container public-inner">
    <Link to="/" className="back-link"><ArrowLeft size={16} /> Khám phá phòng</Link>
    <div className="listing-detail-head"><h1>Yêu cầu của tôi</h1><p>Theo dõi liên hệ và lịch xem phòng đã gửi trên trình duyệt này.</p></div>
    <section className="product-panel">
      {entries.length ? <div className="record-list">{entries.map(inquiry => <article key={inquiry.id} className="record-row">
        <span className="icon-tile tone-violet"><CalendarDays size={18} /></span>
        <div><strong>{inquiry.listingTitle}</strong><p>{inquiry.id} · {formatAppointment(inquiry.appointment)}</p>
          {inquiry.note && <p>Lời nhắn của bạn · {inquiry.note}</p>}{inquiry.response && <p>Chủ trọ · {inquiry.response}</p>}</div>
        <Status>{inquiry.status === 'Mới' ? 'Chờ phản hồi' : inquiry.status}</Status>
      </article>)}</div> : <Blank title="Bạn chưa gửi yêu cầu nào." description="Mở một tin phòng để liên hệ hoặc đề nghị ngày giờ đến xem." />}
    </section>
  </main><PublicFooter /></div>;
}
