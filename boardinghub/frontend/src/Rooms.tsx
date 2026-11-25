import { useState } from 'react';
import {
  Alert, App, Button, Card, Empty, Form, Input, InputNumber, Modal,
  Segmented, Select, Table, Tag,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { Building2, Database, DoorOpen, Layers, Plus, RefreshCw, Search } from 'lucide-react';
import { createProperty, createRoom, getProperties, getRooms, updateRoom, type Property, type Room } from './api';
import { matchText, useDemo } from './demo';
import { useAuth } from './auth';

type DataMode = 'demo' | 'api';
type RoomRow = Omit<Room, 'capacity'> & { location: string; capacity?: number; tenant?: string };
type PropertyFields = { name: string; address?: string };
type RoomFields = { propertyId: number; roomNumber: string; capacity: number; basePrice: number; status: string };

const statuses = [
  { value: 'AVAILABLE', label: 'Phòng trống', tone: 'green' },
  { value: 'OCCUPIED', label: 'Đang cho thuê', tone: 'violet' },
  { value: 'MAINTENANCE', label: 'Đang bảo trì', tone: 'amber' },
];

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export default function Rooms() {
  const {user} = useAuth();
  const { message } = App.useApp();
  const { demo, change } = useDemo();
  const [mode, setMode] = useState<DataMode>('demo');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<number>();
  const [statusFilter, setStatusFilter] = useState<string>();
  const [dialog, setDialog] = useState<'property' | 'room' | null>(null);
  const [editingRoom, setEditingRoom] = useState<RoomRow>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [newPropertyId, setNewPropertyId] = useState<number>();

  const isLive = mode === 'api';
  const propertyOptions = (isLive ? properties : demo.properties).map(({ id, name }) => ({ value: id, label: name }));
  const propertyNames = new Map(propertyOptions.map(({ value, label }) => [value, label]));
  const rows: RoomRow[] = (isLive ? rooms : demo.rooms).map(room => ({ ...room, location: propertyNames.get(room.propertyId) ?? `Khu trọ #${room.propertyId}` }));
  const filteredRows = rows.filter(room => (
    (propertyFilter === undefined || room.propertyId === propertyFilter) &&
    (statusFilter === undefined || room.status === statusFilter) &&
    matchText([room.roomNumber, room.location, room.tenant ?? ''].join(' '), query)
  ));

  async function refresh() {
    setLoading(true);
    setLoadError('');
    try {
      const [nextRooms, nextProperties] = await Promise.all([getRooms(), getProperties()]);
      setRooms(nextRooms);
      setProperties(nextProperties);
    } catch {
      setLoadError('Không kết nối được API. Kiểm tra Spring Boot ở cổng 8080 rồi tải lại.');
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode: DataMode) {
    setMode(nextMode);
    setNewPropertyId(undefined);
    setPropertyFilter(undefined);
    if (nextMode === 'api' && !loading) void refresh();
  }

  function openDialog(nextDialog: 'property' | 'room', room?: RoomRow) {
    setSubmitError('');
    setEditingRoom(room);
    setDialog(nextDialog);
  }

  function closeDialog() {
    if (!submitting) setDialog(null);
  }

  async function addProperty(values: PropertyFields) {
    setSubmitting(true);
    setSubmitError('');
    try {
      const data = { name: values.name.trim(), address: values.address?.trim() ?? '' };
      const property = isLive ? await createProperty(data) : { ...data, id: Math.max(0, ...demo.properties.map(entry => entry.id)) + 1 };
      if (isLive) setProperties(previous => [...previous, property]);
      else change(previous => ({ ...previous, properties: [...previous.properties, property] }));
      setNewPropertyId(property.id);
      setDialog(null);
      void message.success('Đã thêm khu trọ.');
    } catch {
      setSubmitError('Không tạo được khu trọ. Kiểm tra kết nối rồi thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveRoom(values: RoomFields) {
    setSubmitting(true);
    setSubmitError('');
    try {
      const data = { ...values, roomNumber: values.roomNumber.trim(), status: values.status ?? 'AVAILABLE' };
      if (rows.some(room => room.id !== editingRoom?.id && room.propertyId === data.propertyId && room.roomNumber.toLowerCase() === data.roomNumber.toLowerCase())) {
        setSubmitError('Mã phòng đã được sử dụng trong khu trọ này.');
        return;
      }
      if (isLive) {
        const room = editingRoom ? await updateRoom(editingRoom.id, data) : await createRoom(data);
        setRooms(previous => editingRoom ? previous.map(entry => entry.id === room.id ? room : entry) : [...previous, room]);
      } else {
        change(previous => ({
          ...previous,
          rooms: editingRoom ? previous.rooms.map(room => room.id === editingRoom.id ? { ...room, ...data } : room)
            : [...previous.rooms, { ...data, id: Math.max(0, ...previous.rooms.map(room => room.id)) + 1 }],
        }));
      }
      setDialog(null);
      void message.success(editingRoom ? 'Đã cập nhật phòng.' : 'Đã thêm phòng.');
    } catch {
      setSubmitError('Không tạo được phòng. Kiểm tra thông tin và mã phòng trùng.');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: TableColumnsType<RoomRow> = [
    {
      title: 'Số phòng', dataIndex: 'roomNumber', width: 155,
      sorter: (a, b) => a.roomNumber.localeCompare(b.roomNumber, 'vi', { numeric: true }),
      render: (number: string) => <span className="room-number"><span className="icon-tile tone-violet"><DoorOpen size={16} /></span>{number}</span>,
    },
    { title: 'Khu trọ', dataIndex: 'location' },
    isLive
      ? { title: 'Sức chứa', dataIndex: 'capacity', width: 125, render: (capacity?: number) => capacity === undefined ? '—' : `${capacity} người` }
      : { title: 'Người thuê', dataIndex: 'tenant', render: (tenant?: string) => tenant ?? '—' },
    {
      title: 'Giá thuê', dataIndex: 'basePrice', width: 150,
      sorter: (a, b) => a.basePrice - b.basePrice,
      render: (price: number) => <strong className="room-price">{currency.format(price)}</strong>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 155,
      render: (value: string) => {
        const status = statuses.find(option => option.value === value);
        return <span className={`status-label tone-${status?.tone ?? 'blue'}`}>{status?.label ?? value}</span>;
      },
    },
    { title: 'Thao tác', width: 106, render: (_, row) => <button className="text-button" onClick={() => openDialog('room', row)}>Chỉnh sửa</button> },
  ];

  return (
    <div className="rooms-page">
      <div className="page-heading">
        <div><h1>Phòng</h1><p>Danh sách phòng, giá thuê và tình trạng theo khu trọ.</p></div>
        {user?.role === 'ADMIN' ? <Segmented<DataMode>
          aria-label="Nguồn dữ liệu phòng"
          value={mode}
          onChange={changeMode}
          options={[
            { value: 'demo', label: <span className="segmented-label"><Layers size={15} /> Demo UI</span> },
            { value: 'api', label: <span className="segmented-label"><Database size={15} /> API thật</span> },
          ]}
        /> : <span>Dữ liệu minh họa</span>}
      </div>

      <div className="room-summary" aria-label="Tổng hợp trạng thái phòng">
        <div><span className="status-dot tone-blue" /> Tổng số phòng <strong>{rows.length}</strong></div>
        {statuses.map(({ value, label, tone }) => (
          <div key={value}><span className={`status-dot tone-${tone}`} /> {label} <strong>{rows.filter(room => room.status === value).length}</strong></div>
        ))}
      </div>

      {isLive && loadError && <Alert type="error" showIcon title={loadError} />}

      <Card className="rooms-card">
        <div className="rooms-card-head">
          <div className="room-list-title">
            <h2>Danh sách phòng</h2>
            <Tag color={isLive ? 'green' : 'purple'}>{isLive ? 'Dữ liệu PostgreSQL' : 'Dữ liệu minh họa'}</Tag>
          </div>
            <div className="rooms-actions">
              {isLive && <Button icon={<RefreshCw size={15} />} onClick={() => void refresh()} loading={loading} disabled={submitting}>Tải lại</Button>}
              <Button icon={<Building2 size={16} />} onClick={() => openDialog('property')} disabled={loading}>Thêm khu trọ</Button>
              <Button type="primary" icon={<Plus size={17} />} onClick={() => openDialog('room')} disabled={loading || propertyOptions.length === 0}>Thêm phòng</Button>
            </div>
        </div>

        <div className="room-filters">
          <Input
            prefix={<Search size={17} />}
            placeholder={isLive ? 'Tìm theo số phòng hoặc khu trọ' : 'Tìm theo phòng, khu trọ hoặc người thuê'}
            aria-label="Tìm phòng"
            value={query}
            onChange={event => setQuery(event.target.value)}
            allowClear
          />
          <Select
            aria-label="Lọc theo khu trọ"
            placeholder="Tất cả khu trọ"
            value={propertyFilter}
            onChange={setPropertyFilter}
            options={propertyOptions}
            allowClear
          />
          <Select
            aria-label="Lọc theo trạng thái"
            placeholder="Mọi trạng thái"
            value={statusFilter}
            onChange={setStatusFilter}
            options={statuses}
            allowClear
          />
        </div>

        <Table<RoomRow>
          className="room-table"
          rowKey="id"
          columns={columns}
          dataSource={filteredRows}
          loading={isLive && loading}
          pagination={{ defaultPageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
          scroll={{ x: 790 }}
          locale={{
            emptyText: <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={rows.length ? 'Không tìm thấy phòng phù hợp.' : loadError ? 'Chưa tải được danh sách phòng.' : 'Chưa có phòng.'}
            >
              {isLive && !loading && !loadError && rows.length === 0 && (
                <Button type="primary" onClick={() => openDialog(propertyOptions.length ? 'room' : 'property')}>
                  {propertyOptions.length ? 'Thêm phòng đầu tiên' : 'Thêm khu trọ đầu tiên'}
                </Button>
              )}
            </Empty>,
          }}
        />
        <p className="room-result-count">Hiển thị {filteredRows.length} / {rows.length} phòng</p>
      </Card>

      <Modal title="Thêm khu trọ" open={dialog === 'property'} onCancel={closeDialog} footer={null} centered destroyOnHidden>
        <Form<PropertyFields> layout="vertical" onFinish={addProperty} preserve={false} className="room-form">
          {submitError && <Alert type="error" title={submitError} showIcon />}
          <Form.Item label="Tên khu trọ" name="name" rules={[{ required: true, whitespace: true, message: 'Nhập tên khu trọ.' }]}>
            <Input placeholder="Ví dụ: Khu trọ An Bình" maxLength={150} />
          </Form.Item>
          <Form.Item label="Địa chỉ" name="address"><Input placeholder="Số nhà, đường, phường/xã" maxLength={500} /></Form.Item>
          <div className="dialog-actions">
            <Button onClick={closeDialog} disabled={submitting}>Hủy</Button>
            <Button htmlType="submit" type="primary" loading={submitting}>Lưu khu trọ</Button>
          </div>
        </Form>
      </Modal>

      <Modal title={editingRoom ? 'Chỉnh sửa phòng' : 'Thêm phòng'} open={dialog === 'room'} onCancel={closeDialog} footer={null} centered destroyOnHidden>
        <Form<RoomFields>
          layout="vertical"
          initialValues={editingRoom ?? { propertyId: newPropertyId ?? (propertyOptions.length === 1 ? propertyOptions[0].value : undefined), capacity: 2, basePrice: 3000000, status: 'AVAILABLE' }}
          onFinish={saveRoom}
          preserve={false}
          className="room-form"
        >
          {submitError && <Alert type="error" title={submitError} showIcon />}
          <Form.Item label="Khu trọ" name="propertyId" rules={[{ required: true, message: 'Chọn khu trọ.' }]}>
            <Select placeholder="Chọn khu trọ" options={propertyOptions} disabled={!isLive && Boolean(editingRoom)} />
          </Form.Item>
          <Form.Item label="Số phòng" name="roomNumber" rules={[{ required: true, whitespace: true, message: 'Nhập số phòng.' }]}>
            <Input placeholder="Ví dụ: A104" maxLength={30} disabled={!isLive && Boolean(editingRoom)} />
          </Form.Item>
          <div className="room-form-grid">
            <Form.Item label="Sức chứa" name="capacity" rules={[{ required: true, type: 'integer', min: 1, message: 'Nhập số người từ 1 trở lên.' }]}>
              <InputNumber min={1} precision={0} suffix="người" />
            </Form.Item>
            <Form.Item label="Giá thuê" name="basePrice" rules={[{ required: true, type: 'number', min: 0, message: 'Nhập giá thuê từ 0 trở lên.' }]}>
              <InputNumber min={0} precision={2} suffix="₫" />
            </Form.Item>
          </div>
          <Form.Item label="Trạng thái" name="status" rules={[{ required: true }]}>
            <Select options={statuses} />
          </Form.Item>
          <div className="dialog-actions">
            <Button onClick={closeDialog} disabled={submitting}>Hủy</Button>
            <Button htmlType="submit" type="primary" loading={submitting}>Lưu phòng</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
