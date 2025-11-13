import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { DeviceChartData, HierarchyChartData } from '../../services/api';
import GVFWLRCharts from './GVFWLRCharts';
import ProductionMap from './ProductionMap';
import CustomLineChart from './CustomLineChart';
import { AlarmClock, Trash2 } from 'lucide-react';

interface WidgetConfig {
  layoutId: string;
  widgetId: string;
  name: string;
  description: string;
  type: string;
  component: string;
  layoutConfig: any;
  dataSourceConfig: any;
  instanceConfig: any;
  defaultConfig: any;
  displayOrder: number;
}

interface WidgetRendererProps {
  widget: WidgetConfig;
  chartData?: DeviceChartData | null;
  hierarchyChartData?: HierarchyChartData | null;
  timeRange?: '1day' | '7days' | '1month';
  lastRefresh?: Date;
  isDeviceOffline?: boolean;
  selectedDevice?: any;
  selectedHierarchy?: any;
  onDelete?: (layoutId: string) => void;
  isAdmin?: boolean;
}

const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  chartData,
  hierarchyChartData,
  timeRange = '1day',
  lastRefresh,
  isDeviceOffline = false,
  selectedDevice,
  selectedHierarchy,
  onDelete,
  isAdmin = false,
}) => {
  const { theme } = useTheme();
  const { token } = useAuth();
  const dsConfig = widget.dataSourceConfig || {};
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const getScaleFactor = () => {
    if (containerWidth < 150) return 0.6;
    if (containerWidth < 200) return 0.75;
    if (containerWidth < 300) return 0.9;
    if (containerWidth < 400) return 1;
    return 1.2;
  };

  const scaleFactor = getScaleFactor();

  const handleDelete = async () => {
    if (!onDelete || !token) return;
    if (!confirm(`Are you sure you want to delete "${widget.name}"?`)) return;
    onDelete(widget.layoutId);
  };

  // Helper to get metric value
  const getMetricValue = (metric: string) => {
    let value = 0;

    if (hierarchyChartData?.chartData && hierarchyChartData.chartData.length > 0) {
      const latest = hierarchyChartData.chartData[hierarchyChartData.chartData.length - 1];
      switch (metric) {
        case 'ofr':
          value = latest.totalOfr || 0;
          break;
        case 'wfr':
          value = latest.totalWfr || 0;
          break;
        case 'gfr':
          value = latest.totalGfr || 0;
          break;
      }
    } else if (chartData?.chartData && chartData.chartData.length > 0) {
      const latest = chartData.chartData[chartData.chartData.length - 1];
      switch (metric) {
        case 'ofr':
          value = latest.ofr || 0;
          break;
        case 'wfr':
          value = latest.wfr || 0;
          break;
        case 'gfr':
          value = latest.gfr || 0;
          break;
      }
    }

    return value;
  };

  // Check if this is a line chart widget with seriesConfig
  const isLineChartWidget = dsConfig.seriesConfig && Array.isArray(dsConfig.seriesConfig) && dsConfig.seriesConfig.length > 0;

  // Render based on component type
  switch (widget.component) {
    case 'CustomLineChart':
      return (
        <div className="h-full relative">
          {isAdmin && onDelete && (
            <button
              onClick={handleDelete}
              className={`absolute top-2 right-2 z-20 p-2 rounded-lg transition-all ${
                theme === 'dark'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
              title="Delete widget"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <CustomLineChart
            widgetConfig={widget}
            timeRange={timeRange}
            selectedHierarchy={selectedHierarchy}
            selectedDevice={selectedDevice}
          />
        </div>
      );
    case 'MetricsCard':
      if (dsConfig.metric === 'last_refresh') {
        const formattedTime = lastRefresh
          ? new Date(lastRefresh).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })
          : '--:--:--';

        const padding = containerWidth < 150 ? 8 : containerWidth < 250 ? 12 : 16;
        const gap = containerWidth < 150 ? 8 : containerWidth < 250 ? 10 : 12;
        const iconSize = Math.max(32, Math.min(40, containerWidth * 0.25));
        const titleSize = Math.max(10, Math.min(14, containerWidth * 0.08));
        const valueSize = Math.max(18, Math.min(36, containerWidth * 0.3));

        return (
          <div ref={containerRef} className="h-full w-full">
            <div
              className={`h-full rounded-lg transition-all duration-300 overflow-hidden ${
                theme === 'dark' ? 'bg-[#162345]' : 'bg-white border border-gray-200'
              }`}
              style={{ padding: `${padding}px` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: `${gap}px`, marginBottom: `${gap}px` }}>
                <div
                  style={{
                    width: `${iconSize}px`,
                    height: `${iconSize}px`,
                    backgroundColor: dsConfig.color || '#d82e75',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlarmClock style={{ width: iconSize * 0.5, height: iconSize * 0.5, color: 'white' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: `${titleSize}px`,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: theme === 'dark' ? '#D0CCD8' : '#555758',
                    }}
                  >
                    Last Refresh
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}>
                <span
                  style={{
                    fontSize: `${valueSize}px`,
                    fontWeight: 'bold',
                    lineHeight: 1,
                    flex: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: theme === 'dark' ? 'white' : '#1f2937',
                  }}
                >
                  {formattedTime}
                </span>
              </div>
            </div>
          </div>
        );
      }

      const value = getMetricValue(dsConfig.metric);
      const padding = containerWidth < 150 ? 8 : containerWidth < 250 ? 12 : 16;
      const gap = containerWidth < 150 ? 8 : containerWidth < 250 ? 10 : 12;
      const iconSize = Math.max(32, Math.min(40, containerWidth * 0.25));
      const titleSize = Math.max(10, Math.min(14, containerWidth * 0.08));
      const valueSize = Math.max(18, Math.min(36, containerWidth * 0.3));
      const unitSize = Math.max(10, Math.min(16, containerWidth * 0.08));

      return (
        <div ref={containerRef} className="h-full w-full">
          <div
            className={`h-full rounded-lg transition-all duration-300 overflow-hidden ${
              theme === 'dark' ? 'bg-[#162345]' : 'bg-white border border-gray-200'
            }`}
            style={{ padding: `${padding}px` }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: `${gap}px`, marginBottom: `${gap}px` }}>
              <div
                style={{
                  width: `${iconSize}px`,
                  height: `${iconSize}px`,
                  backgroundColor: theme === 'dark' ? (dsConfig.colorDark || '#4D3DF7') : (dsConfig.colorLight || '#F56C44'),
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <img src={dsConfig.icon || '/oildark.png'} alt={dsConfig.title} style={{ width: iconSize * 0.6, height: iconSize * 0.6 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: `${titleSize}px`,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: theme === 'dark' ? '#D0CCD8' : '#555758',
                  }}
                >
                  {dsConfig.title || 'Metric'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}>
              <span
                style={{
                  fontSize: `${valueSize}px`,
                  fontWeight: 'bold',
                  lineHeight: 1,
                  flex: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: isDeviceOffline
                    ? theme === 'dark' ? '#6b7280' : '#9ca3af'
                    : theme === 'dark' ? 'white' : '#1f2937',
                }}
              >
                {value.toFixed(2)}
              </span>
              <span
                style={{
                  fontSize: `${unitSize}px`,
                  flex: 'none',
                  color: theme === 'dark' ? '#D0CCD8' : '#555758',
                }}
              >
                {dsConfig.unit || 'l/min'}
              </span>
            </div>
          </div>
        </div>
      );


    case 'GVFWLRChart':
      return (
        <div className={`h-full rounded-lg ${
          theme === 'dark' ? 'bg-[#162345]' : 'bg-white border border-gray-200'
        }`}>
          <GVFWLRCharts
            chartData={chartData}
            hierarchyChartData={hierarchyChartData}
            isDeviceOffline={isDeviceOffline}
            widgetConfig={widget}
          />
        </div>
      );

    case 'ProductionMap':
      return (
        <div className="h-full">
          <ProductionMap
            selectedHierarchy={selectedHierarchy}
            selectedDevice={selectedDevice}
            widgetConfig={widget}
          />
        </div>
      );

    default:
      return (
        <div className={`h-full rounded-lg p-4 flex items-center justify-center ${
          theme === 'dark' ? 'bg-[#162345] text-white' : 'bg-white border border-gray-200 text-gray-900'
        }`}>
          <div className="text-center">
            <p className="text-sm opacity-50">Unknown widget type:</p>
            <p className="font-semibold">{widget.component}</p>
          </div>
        </div>
      );
  }
};

export default WidgetRenderer;
