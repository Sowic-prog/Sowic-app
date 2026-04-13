import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export const PWAUpdateNotification: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needUpdate: [needUpdate, setNeedUpdate],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
      // Check for updates every hour
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedUpdate(false);
  };

  useEffect(() => {
    if (needUpdate) {
        console.log("New content available, please refresh.");
    }
  }, [needUpdate]);

  if (!offlineReady && !needUpdate) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[9999] max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className={`p-2 rounded-xl ${needUpdate ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
              <RefreshCw className={`w-5 h-5 ${needUpdate ? 'animate-spin-slow' : ''}`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {needUpdate ? '¡Actualización disponible!' : 'Lista para usar sin conexión'}
              </h3>
              <p className="text-sm text-slate-500">
                {needUpdate 
                  ? 'Hay una nueva versión con mejoras y correcciones.' 
                  : 'La aplicación se ha guardado para funcionar sin internet.'}
              </p>
            </div>
          </div>
          <button 
            onClick={close}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {needUpdate && (
          <button
            onClick={() => updateServiceWorker(true)}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 rounded-xl transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar ahora
          </button>
        )}
      </div>
    </div>
  );
};
