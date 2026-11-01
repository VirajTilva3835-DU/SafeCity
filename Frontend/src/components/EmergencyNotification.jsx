import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, X, MapPin, Zap, Siren, BellRing } from 'lucide-react';

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000");

const EmergencyNotification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newAlerts, setNewAlerts] = useState([]);

  const dismissAlert = useCallback((id) => {
    setNewAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const checkRelevance = useCallback((alert) => {
    if (!user || !alert) return false;
    if (user.role === 'admin') return true; // Admins see everything

    const alertState = (alert.state || '').trim().toLowerCase();
    const userState = (user.state || '').trim().toLowerCase();
    
    if (alertState && userState && alertState !== userState) return false;

    const dept = (user.departmentType || '').toLowerCase();
    const aDept = (alert.assignedDepartment || '').toLowerCase();
    const aType = (alert.type || '').toLowerCase();

    if (dept === 'police') return aDept === 'police' || aType === 'crime' || aType === 'accident' || aType === 'sos';
    if (dept === 'fire') return aDept === 'fire' || aType === 'fire' || aType === 'sos';
    if (dept === 'ambulance' || dept === 'medical') return aDept === 'ambulance' || aDept === 'medical' || aType === 'medical' || aType === 'accident' || aType === 'sos';
    return aDept === dept || aDept === 'none' || aType === 'sos';
  }, [user]);

  useEffect(() => {
    if (!user) return;

    socket.on('newAlert', (alert) => {
      if (checkRelevance(alert)) {
        const id = Date.now();
        setNewAlerts(prev => [...prev, { ...alert, id }]);
        
        // Play alert sound
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});
        } catch {
          console.log('Audio play failed');
        }

        // Auto dismiss after 15 seconds
        setTimeout(() => {
          dismissAlert(id);
        }, 15000);
      }
    });

    return () => {
      socket.off('newAlert');
    };
  }, [user, checkRelevance, dismissAlert]);

  const handleNavigate = (alert) => {
    if (user.role === 'admin') navigate('/admin');
    else navigate('/dashboard');
    dismissAlert(alert.id);
  };

  if (newAlerts.length === 0) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-[9999] space-y-3">
      {newAlerts.map((alert) => (
        <div 
          key={alert.id}
          onClick={() => handleNavigate(alert)}
          className="bg-white border-4 border-red-600 rounded-[2.5rem] shadow-[0_20px_50px_rgba(220,38,38,0.3)] p-6 cursor-pointer transform hover:scale-105 transition-all animate-in slide-in-from-top-10 relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-red-600 animate-pulse"></div>
          
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-red-600 rounded-[1.5rem] flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-200 animate-bounce">
              <Siren size={32} />
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1 mb-1">
                  <Zap size={12} className="fill-red-600" /> CRITICAL INCIDENT DETECTED
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>
              
              <h3 className="text-xl font-black text-gray-900 leading-tight">
                {alert.type.toUpperCase()} REPORTED
              </h3>
              <p className="text-gray-500 text-sm font-bold mt-1 line-clamp-1">
                {alert.description || 'New emergency report needs attention.'}
              </p>
              
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase">
                  <MapPin size={12} /> {alert.state || 'Local'}
                </div>
                <div className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-full uppercase">
                  Level {alert.triageLevel || 'SOS'}
                </div>
                <div className="ml-auto text-red-600 font-black text-[10px] uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Respond Now <BellRing size={12} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmergencyNotification;
