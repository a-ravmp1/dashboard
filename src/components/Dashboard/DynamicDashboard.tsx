import React, { useState, useEffect, useMemo, useRef } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/api';
import 'react-grid-layout/css/styles.css';

interface WidgetConfig {
  layoutId: string;
  widgetId: string;
  name: string;
  description: string;
  type: string;
  component: string;
  layoutConfig: {
    x: number;
    y: number;
    w: number;
    h: number;
    minW: number;
    minH: number;
    static: boolean;
  };
  dataSourceConfig: any;
  instanceConfig: any;
  defaultConfig: any;
  displayOrder: number;
}

interface DynamicDashboardProps {
  dashboardId: string;
  widgets: WidgetConfig[];
  onLayoutChange?: (layouts: Layout[]) => void;
  isEditable?: boolean;
  children: (widget: WidgetConfig) => React.ReactNode;
}

const DynamicDashboard: React.FC<DynamicDashboardProps> = ({
  dashboardId,
  widgets,
  onLayoutChange,
  isEditable = false,
  children,
}) => {
  const { theme } = useTheme();
  const { token } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track container width for responsive grid
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);

    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateWidth);
      resizeObserver.disconnect();
    };
  }, []);

  // Convert widget configs to react-grid-layout format
  const layouts = useMemo(() => {
    return widgets.map((widget) => ({
      i: widget.layoutId,
      x: widget.layoutConfig?.x ?? 0,
      y: widget.layoutConfig?.y ?? 0,
      w: widget.layoutConfig?.w ?? 4,
      h: widget.layoutConfig?.h ?? 2,
      minW: widget.layoutConfig?.minW ?? 2,
      minH: widget.layoutConfig?.minH ?? 1,
      static: isEditable ? false : (widget.layoutConfig?.static ?? false),
    }));
  }, [widgets, isEditable]);

  console.log('[GRID] Rendering', widgets.length, 'widgets in', layouts.length, 'positions');

  const handleLayoutChange = async (newLayout: Layout[]) => {
    if (!isEditable) return;

    console.log('[DYNAMIC DASHBOARD] Layout changed:', newLayout);

    // Call parent callback if provided
    if (onLayoutChange) {
      onLayoutChange(newLayout);
    }

    // Auto-save to database
    if (token) {
      try {
        setIsSaving(true);

        const layoutUpdates = newLayout.map((layout) => ({
          layoutId: layout.i,
          layoutConfig: {
            x: layout.x,
            y: layout.y,
            w: layout.w,
            h: layout.h,
            minW: layout.minW ?? 2,
            minH: layout.minH ?? 1,
            static: layout.static ?? false,
          },
        }));

        await apiService.updateDashboardLayouts(dashboardId, layoutUpdates, token);
        console.log('[DYNAMIC DASHBOARD] Layout saved to database');
      } catch (error) {
        console.error('[DYNAMIC DASHBOARD] Failed to save layout:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Create a map of layoutId to widget for quick lookup
  const widgetMap = useMemo(() => {
    const map = new Map<string, WidgetConfig>();
    widgets.forEach((widget) => {
      map.set(widget.layoutId, widget);
    });
    return map;
  }, [widgets]);

  return (
    <div ref={containerRef} className="relative w-full">
      {isSaving && (
        <div className="absolute top-2 right-2 z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500 text-white text-sm shadow-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Saving layout...</span>
        </div>
      )}

      <GridLayout
        className="layout"
        layout={layouts}
        cols={12}
        rowHeight={100}
        width={containerWidth}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        isDraggable={isEditable}
        isResizable={isEditable}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        compactType="vertical"
        preventCollision={false}
      >
        {layouts.map((layout) => {
          const widget = widgetMap.get(layout.i);
          if (!widget) return null;

          return (
            <div
              key={layout.i}
              className={`rounded-lg overflow-hidden shadow-sm transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-[#162345]'
                  : 'bg-white border border-gray-200'
              }`}
              style={{
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {isEditable && (
                <div className="drag-handle absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-blue-500 to-blue-600 cursor-move z-10 hover:w-1.5 transition-all"></div>
              )}
              <div className={`h-full`}>
                {children(widget)}
              </div>
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
};

export default DynamicDashboard;
