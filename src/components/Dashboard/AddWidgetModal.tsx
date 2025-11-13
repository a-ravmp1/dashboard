import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DeviceType {
  id: number;
  typeName: string;
  logo: string;
}

interface WidgetType {
  id: string;
  name: string;
  componentName: string;
  defaultConfig: any;
  displayName: string;
}

interface Property {
  id: number;
  name: string;
  tag: string;
  dataType: string;
  unit: string;
  order: number;
}

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const dummyData = [
  { time: '14:25:38', s1: 4000, s2: 2400, s3: 2400 },
  { time: '14:29:38', s1: 3000, s2: 1398, s3: 2210 },
  { time: '14:35:32', s1: 2000, s2: 9800, s3: 2290 },
  { time: '14:39:12', s1: 2780, s2: 3908, s3: 2000 },
  { time: '14:53:54', s1: 1890, s2: 4800, s3: 2181 },
  { time: '14:55:44', s1: 2390, s2: 3800, s3: 2500 },
];

const COLORS = ['#7B61FF', '#4FC3F7', '#EC4899', '#10B981', '#F59E0B'];

const AddWidgetModal: React.FC<AddWidgetModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { theme } = useTheme();
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState<'line' | 'scatter' | 'area' | 'bar' | 'pie'>('line');
  const [showGrid, setShowGrid] = useState(true);
  const [showDots, setShowDots] = useState(true);

  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [widgetTypes, setWidgetTypes] = useState<WidgetType[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const [selectedDeviceType, setSelectedDeviceType] = useState<number | null>(null);
  const [selectedWidgetType, setSelectedWidgetType] = useState<string | null>(null);
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [widgetName, setWidgetName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadDeviceTypes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedDeviceType) {
      loadAvailableWidgets();
    }
  }, [selectedDeviceType]);

  const loadDeviceTypes = async () => {
    if (!token) return;

    try {
      const response = await fetch('http://localhost:5000/api/widgets/device-types', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setDeviceTypes(result.data);
      }
    } catch (err) {
      console.error('Failed to load device types:', err);
    }
  };

  const loadAvailableWidgets = async () => {
    if (!token || !selectedDeviceType) return;

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/widgets/available-widgets?deviceTypeId=${selectedDeviceType}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        setWidgetTypes(result.data.widgetTypes);
        setProperties(result.data.properties);
      }
    } catch (err) {
      console.error('Failed to load available widgets:', err);
      setError('Failed to load widget options');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyToggle = (propertyId: number) => {
    setSelectedProperties((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleCreateWidget = async () => {
    if (!token || !selectedDeviceType || !selectedWidgetType || selectedProperties.length === 0) {
      setError('Please complete all steps');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/widgets/create-widget', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceTypeId: selectedDeviceType,
          widgetTypeId: selectedWidgetType,
          propertyIds: selectedProperties,
          displayName: widgetName || undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        setError(result.message || 'Failed to create widget');
      }
    } catch (err) {
      console.error('Failed to create widget:', err);
      setError('Failed to create widget');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedDeviceType(null);
    setSelectedWidgetType(null);
    setSelectedProperties([]);
    setWidgetName('');
    setError('');
    onClose();
  };

  const canProceed = () => {
    if (step === 1) return selectedDeviceType !== null;
    if (step === 2) return selectedWidgetType !== null;
    if (step === 3) return selectedProperties.length > 0;
    return false;
  };

  if (!isOpen) return null;

  const bg = theme === 'dark' ? 'bg-[#0b1326] text-white' : 'bg-white text-gray-900';
  const border = theme === 'dark' ? 'border-white/10' : 'border-gray-300';

  const renderPreview = () => {
    switch (chartType) {
      case 'scatter':
        return (
          <ScatterChart data={dummyData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Scatter name="Series 1" data={dummyData} fill={COLORS[0]} />
            <Scatter name="Series 2" data={dummyData} fill={COLORS[1]} />
            <Scatter name="Series 3" data={dummyData} fill={COLORS[2]} />
          </ScatterChart>
        );
      case 'area':
        return (
          <AreaChart data={dummyData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="s1"
              stackId="1"
              stroke={COLORS[0]}
              fill={COLORS[0]}
              fillOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="s2"
              stackId="1"
              stroke={COLORS[1]}
              fill={COLORS[1]}
              fillOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="s3"
              stackId="1"
              stroke={COLORS[2]}
              fill={COLORS[2]}
              fillOpacity={0.5}
            />
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart data={dummyData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="s1" fill={COLORS[0]} />
            <Bar dataKey="s2" fill={COLORS[1]} />
            <Bar dataKey="s3" fill={COLORS[2]} />
          </BarChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Tooltip />
            <Pie data={dummyData} dataKey="s1" nameKey="time" outerRadius={100}>
              {dummyData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      default:
        return (
          <LineChart data={dummyData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="s1"
              stroke={COLORS[0]}
              dot={showDots}
            />
            <Line
              type="monotone"
              dataKey="s2"
              stroke={COLORS[1]}
              dot={showDots}
            />
            <Line
              type="monotone"
              dataKey="s3"
              stroke={COLORS[2]}
              dot={showDots}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className={`w-[90%] max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border ${border} ${bg} p-6 relative`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Charts</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-4 mb-6 text-sm font-medium border-b border-gray-700/30 pb-2">
          {['line', 'scatter', 'area', 'bar', 'pie'].map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type as any)}
              className={`px-3 py-1 rounded-md transition ${
                chartType === type
                  ? theme === 'dark'
                    ? 'bg-[#162345] text-white'
                    : 'bg-blue-100 text-blue-700'
                  : 'text-gray-400 hover:text-white/90'
              }`}
            >
              {type === 'pie'
                ? 'Pie/Doughnut'
                : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6 text-sm">
          <div>
            <label className="block mb-2 opacity-80">Device</label>
            <input
              className={`w-full px-3 py-2 rounded-md border ${border} bg-transparent`}
              placeholder="Name of device"
            />
          </div>
          <div>
            <label className="block mb-2 opacity-80">No of series</label>
            <select
              className={`w-full px-3 py-2 rounded-md border ${border} bg-transparent`}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 opacity-80">Names of property</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                className={`px-2 py-2 rounded-md border ${border} bg-transparent`}
                placeholder="Series 1"
              />
              <input
                className={`px-2 py-2 rounded-md border ${border} bg-transparent`}
                placeholder="Series 2"
              />
              <input
                className={`px-2 py-2 rounded-md border ${border} bg-transparent`}
                placeholder="Series 3"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-6 mb-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!showGrid}
              onChange={() => setShowGrid((prev) => !prev)}
            />
            Hide grid
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!showDots}
              onChange={() => setShowDots((prev) => !prev)}
            />
            Hide dots
          </label>
        </div>

        <div
          className="rounded-lg border p-4 overflow-hidden"
          style={{ height: 300 }}
        >
          <h3 className="text-sm mb-2 font-medium opacity-80">Preview</h3>
          <ResponsiveContainer width="100%" height="100%">
            {renderPreview()}
          </ResponsiveContainer>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className={`rounded-lg px-6 py-2 font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateWidget}
            disabled={loading}
            className={`rounded-lg px-6 py-2 font-medium transition-colors ${
              loading
                ? 'cursor-not-allowed opacity-50'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {loading ? 'Creating...' : 'Create Widget'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddWidgetModal;
