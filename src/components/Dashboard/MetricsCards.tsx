import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { HierarchyChartData, DeviceChartData } from '../../services/api';
import { AlarmClock, RefreshCw } from 'lucide-react';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface MetricsCardsProps {
  selectedHierarchy?: any;
  selectedDevice?: any;
  chartData?: DeviceChartData | null;
  hierarchyChartData?: HierarchyChartData | null;
  lastRefresh?: Date | null;
  isDeviceOffline?: boolean;
  widgetConfigs?: any[];

  /**
   * Called when the component requests a refresh.
   * Parent should fetch new chartData / hierarchyChartData / lastRefresh and pass them back as props.
   */
  onRefreshRequested?: () => void;

  /**
   * Auto-refresh interval in milliseconds (default: 5000)
   */
  refreshIntervalMs?: number;
}

const MetricsCards: React.FC<MetricsCardsProps> = ({
  selectedHierarchy,
  selectedDevice,
  chartData,
  hierarchyChartData,
  lastRefresh = null,
  isDeviceOffline = false,
  widgetConfigs = [],
  onRefreshRequested,
  refreshIntervalMs = 5000,
}) => {
  const { user, token } = useAuth();
  const { theme } = useTheme();

  const [currentTime, setCurrentTime] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [flowRateData, setFlowRateData] = useState({
    totalOFR: 0,
    totalWFR: 0,
    totalGFR: 0,
    avgGVF: 0,
    avgWLR: 0,
  });

  // Track card dimensions for responsive font sizing
  const [cardDimensions, setCardDimensions] = useState<{ width: number; height: number }[]>([
    { width: 0, height: 0 },
    { width: 0, height: 0 },
    { width: 0, height: 0 },
    { width: 0, height: 0 },
  ]);

  // Live clock for fallback when lastRefresh not provided
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setCurrentTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Track card dimensions for responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      const newDimensions = cardRefs.current.map((ref) => {
        if (ref) {
          const rect = ref.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }
        return { width: 0, height: 0 };
      });
      setCardDimensions(newDimensions);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    const resizeObserver = new ResizeObserver(updateDimensions);
    cardRefs.current.forEach((ref) => {
      if (ref) resizeObserver.observe(ref);
    });

    return () => {
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, []);

  // Auto-refresh loop: only visual animation is shown on Last Refresh card.
  // The component will call onRefreshRequested() so the parent can update data.
  useEffect(() => {
    const startAutoRefresh = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      refreshIntervalRef.current = setInterval(() => {
        // visual indicator only for "Last Refresh" card
        setIsRefreshing(true);
        // ask parent to refresh data
        try {
          onRefreshRequested?.();
        } catch (e) {
          // parent handler might not exist — ignore
        }
        // stop visual indicator after short time
        setTimeout(() => setIsRefreshing(false), 800);
      }, refreshIntervalMs);
    };

    startAutoRefresh();
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
    // Recreate interval if refreshIntervalMs or handler changes
  }, [refreshIntervalMs, onRefreshRequested]);

  // Compute flow aggregates from chart payloads (updated when props change)
  useEffect(() => {
    if (hierarchyChartData?.chartData && hierarchyChartData.chartData.length > 0) {
      const latest = hierarchyChartData.chartData[hierarchyChartData.chartData.length - 1];
      console.log('[METRICS CARDS] Using hierarchy chart data:', latest);
      setFlowRateData({
        totalOFR: latest.totalOfr || 0,
        totalWFR: latest.totalWfr || 0,
        totalGFR: latest.totalGfr || 0,
        avgGVF: latest.totalGvf || 0,
        avgWLR: latest.totalWlr || 0,
      });
    } else if (chartData?.chartData && chartData.chartData.length > 0) {
      const latest = chartData.chartData[chartData.chartData.length - 1];
      console.log('[METRICS CARDS] Using device chart data:', latest);
      setFlowRateData({
        totalOFR: latest.ofr || 0,
        totalWFR: latest.wfr || 0,
        totalGFR: latest.gfr || 0,
        avgGVF: latest.gvf || 0,
        avgWLR: latest.wlr || 0,
      });
    } else {
      console.log('[METRICS CARDS] No data available, using defaults');
      setFlowRateData({
        totalOFR: 0,
        totalWFR: 0,
        totalGFR: 0,
        avgGVF: 0,
        avgWLR: 0,
      });
    }
  }, [chartData, hierarchyChartData]);

  // Calculate responsive font size based on card width and value length
  const getValueFontSize = (cardIndex: number, value: string) => {
    const cardWidth = cardDimensions[cardIndex]?.width || 200;
    const valueLength = value.length;

    // Base calculation: smaller font for longer numbers
    let baseFontSize = Math.max(20, Math.min(48, cardWidth / 6));

    // Adjust based on value length
    if (valueLength > 8) {
      baseFontSize = baseFontSize * 0.6;
    } else if (valueLength > 6) {
      baseFontSize = baseFontSize * 0.75;
    } else if (valueLength > 4) {
      baseFontSize = baseFontSize * 0.85;
    }

    return Math.max(16, Math.min(48, baseFontSize));
  };

  const getUnitFontSize = (cardIndex: number) => {
    const cardWidth = cardDimensions[cardIndex]?.width || 200;
    return Math.max(10, Math.min(16, cardWidth / 18));
  };

  const metrics = widgetConfigs.length > 0 ? widgetConfigs.map(config => {
    const dsConfig = config.dataSourceConfig || {};
    let value = 0;

    switch (dsConfig.metric) {
      case 'ofr':
        value = flowRateData.totalOFR;
        break;
      case 'wfr':
        value = flowRateData.totalWFR;
        break;
      case 'gfr':
        value = flowRateData.totalGFR;
        break;
      default:
        value = 0;
    }

    return {
      icon: dsConfig.icon || '/oildark.png',
      title: dsConfig.title || 'Metric',
      shortTitle: dsConfig.shortTitle || dsConfig.title || 'N/A',
      value: value.toFixed(2),
      unit: dsConfig.unit || 'l/min',
      color: theme === 'dark' ? (dsConfig.colorDark || '#4D3DF7') : (dsConfig.colorLight || '#F56C44'),
      metric: dsConfig.metric
    };
  }).filter(m => m.metric !== 'last_refresh') : [
    {
      icon: '/oildark.png',
      title: 'Oil flow rate',
      shortTitle: 'OFR',
      value: flowRateData.totalOFR.toFixed(2),
      unit: 'l/min',
      color: theme === 'dark' ? '#4D3DF7' : '#F56C44',
      metric: 'ofr'
    },
    {
      icon: '/waterdark.png',
      title: 'Water flow rate',
      shortTitle: 'WFR',
      value: flowRateData.totalWFR.toFixed(2),
      unit: 'l/min',
      color: theme === 'dark' ? '#46B8E9' : '#F6CA58',
      metric: 'wfr'
    },
    {
      icon: '/gasdark.png',
      title: 'Gas flow rate',
      shortTitle: 'GFR',
      value: flowRateData.totalGFR.toFixed(2),
      unit: 'l/min',
      color: theme === 'dark' ? '#F35DCB' : '#38BF9D',
      metric: 'gfr'
    },
  ];

  // Format last refresh time to HH:MM:SS (24h). Fallback to live clock
  const formattedLastRefresh = lastRefresh
    ? new Date(lastRefresh).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : currentTime;

  const lastRefreshLabel = lastRefresh ? 'From server' : 'Live';

  const showLastRefresh = widgetConfigs.length === 0 || widgetConfigs.some(w => w.dataSourceConfig?.metric === 'last_refresh');
  const lastRefreshConfig = widgetConfigs.find(w => w.dataSourceConfig?.metric === 'last_refresh')?.dataSourceConfig || { color: '#d82e75' };

  const layout: Layout[] = [
    { i: 'ofr', x: 0, y: 0, w: 1, h: 1 },
    { i: 'wfr', x: 1, y: 0, w: 1, h: 1 },
    { i: 'gfr', x: 2, y: 0, w: 1, h: 1 },
    { i: 'refresh', x: 3, y: 0, w: 1, h: 1 },
  ];

  const renderMetricCard = (metric: any) => (
    <div
      className={`rounded-lg p-4 transition-all duration-300 ${
        theme === 'dark' ? 'bg-[#162345]' : 'bg-white border border-gray-200'
      }`}
    >
      <div className="flex items-center gap-4 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: metric.color }}
        >
          <img src={metric.icon} alt={metric.title} className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-semibold truncate ${
              theme === 'dark' ? 'text-[#D0CCD8]' : 'text-[#555758]'
            }`}
          >
            <span className="hidden md:inline">{metric.title}</span>
            <span className="md:hidden">{metric.shortTitle}</span>
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-4 mb-2">
        <span
          className={`xl:text-4xl lg:text-2xl md:text-xl font-bold sm:3xl ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}
        >
          {metric.value}
        </span>
        <span
          className={`text-base ${
            theme === 'dark' ? 'text-[#D0CCD8]' : 'text-[#555758]'
          }`}
        >
          {metric.unit}
        </span>
      </div>
    </div>
  );

  const renderLastRefreshCard = () => (
    <div
      className={`rounded-lg p-4 transition-all duration-300 flex flex-col justify-between ${
        theme === 'dark' ? 'bg-[#162345]' : 'bg-white border border-gray-200'
      } ${
        isRefreshing ? 'ring-2 ring-blue-400 ring-opacity-50 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center gap-4 ">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#d82e75' }}
        >
          <AlarmClock className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-semibold ${
              theme === 'dark' ? 'text-[#D0CCD8]' : 'text-[#555758]'
            }`}
          >
            Last Refresh
          </div>
          <div
            className={`text-xs mt-0.5 hidden md:block ${
              theme === 'dark' ? 'text-[#A2AED4]' : 'text-gray-500'
            }`}
          >
            {lastRefreshLabel}
          </div>
        </div>

        {isRefreshing && (
          <RefreshCw
            className={`w-4 h-4 animate-spin ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
            }`}
          />
        )}
      </div>

      <div className="mt-2">
        <div
          className={`xl:text-2xl lg:text-xl md:text-xl sm:3xl font-semibold leading-none ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}
        >
          {formattedLastRefresh}
        </div>
        <div
          className={`text-xs mt-1 ${
            theme === 'dark' ? 'text-[#D0CCD8]' : 'text-[#555758]'
          }`}
        >
          {lastRefresh ? new Date(lastRefresh).toLocaleDateString('en-GB') : ''}
        </div>
      </div>
    </div>
  );

  return (
    <div className="">
      <GridLayout
        className="w-full"
        layout={layout}
        cols={4}
        rowHeight={130}
        width={1500}
        isDraggable={false}
        isResizable={false}
        compactType={null}
        preventCollision={true}
      >
        <div key="ofr" data-grid={{ i: 'ofr', x: 0, y: 0, w: 1, h: 1 }}>
          {renderMetricCard(metrics[0])}
        </div>
        <div key="wfr" data-grid={{ i: 'wfr', x: 1, y: 0, w: 1, h: 1 }}>
          {renderMetricCard(metrics[1])}
        </div>
        <div key="gfr" data-grid={{ i: 'gfr', x: 2, y: 0, w: 1, h: 1 }}>
          {renderMetricCard(metrics[2])}
        </div>
        <div key="refresh" data-grid={{ i: 'refresh', x: 3, y: 0, w: 1, h: 1 }}>
          {renderLastRefreshCard()}
        </div>
      </GridLayout>
    </div>
  );
};

export default MetricsCards;
