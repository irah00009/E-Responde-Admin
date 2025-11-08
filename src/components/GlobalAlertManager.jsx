import { useCallback, useEffect, useRef, useState } from 'react';
import { getDatabase, ref, onValue, off, get } from 'firebase/database';
import { app } from '../firebase';

const ALERT_AUTO_CLOSE_FALLBACK_MS = 8000;

const GlobalAlertManager = () => {
  const [visibleAlert, setVisibleAlert] = useState(null);
  const [alarmEnabled, setAlarmEnabled] = useState(true);

  const lastReportIdsRef = useRef(new Set());
  const lastSmartWatchAlertIdsRef = useRef(new Set());
  const notificationTimeoutRef = useRef(null);
  const alarmAudioRef = useRef(null);
  const alarmLoopTimeoutRef = useRef(null);
  const alarmCleanupTimeoutRef = useRef(null);
  const alarmEnabledRef = useRef(true);
  const alertRef = useRef(null);

  const clearNotificationTimeout = useCallback(() => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
  }, []);

  const stopAlarmSound = useCallback(() => {
    if (alarmLoopTimeoutRef.current) {
      clearTimeout(alarmLoopTimeoutRef.current);
      alarmLoopTimeoutRef.current = null;
    }

    if (alarmCleanupTimeoutRef.current) {
      clearTimeout(alarmCleanupTimeoutRef.current);
      alarmCleanupTimeoutRef.current = null;
    }

    if (alarmAudioRef.current) {
      try {
        alarmAudioRef.current.oscillator1?.stop?.();
        alarmAudioRef.current.oscillator2?.stop?.();
        alarmAudioRef.current.audioContext?.close?.();
      } catch (error) {
        console.log('Could not stop alarm sound:', error);
      } finally {
        alarmAudioRef.current = null;
      }
    }
  }, []);

  const playAlarmSound = useCallback(() => {
    if (!alarmEnabledRef.current) {
      return;
    }

    const playBurst = () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator1.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
        oscillator1.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        oscillator1.frequency.setValueAtTime(1200, audioContext.currentTime + 0.3);

        oscillator2.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator2.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        oscillator2.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
        oscillator2.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3);

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.95, audioContext.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.95, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.6, audioContext.currentTime + 0.2);
        gainNode.gain.linearRampToValueAtTime(0.95, audioContext.currentTime + 0.25);
        gainNode.gain.setValueAtTime(0.95, audioContext.currentTime + 0.3);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.35);

        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.4);
        oscillator2.stop(audioContext.currentTime + 0.4);

        alarmAudioRef.current = { audioContext, oscillator1, oscillator2, gainNode };

        alarmCleanupTimeoutRef.current = setTimeout(() => {
          try {
            if (alarmAudioRef.current?.audioContext === audioContext) {
              alarmAudioRef.current = null;
            }
            audioContext.close();
          } catch (error) {
            console.log('Could not cleanup alarm audio:', error);
          } finally {
            alarmCleanupTimeoutRef.current = null;
          }
        }, 650);
      } catch (error) {
        console.log('Could not play alarm sound:', error);
      }
    };

    const startLoop = () => {
      if (!alarmEnabledRef.current || !alertRef.current) {
        stopAlarmSound();
        return;
      }

      playBurst();

      alarmLoopTimeoutRef.current = setTimeout(() => {
        if (!alarmEnabledRef.current || !alertRef.current) {
          stopAlarmSound();
          return;
        }
        startLoop();
      }, 700);
    };

    stopAlarmSound();
    startLoop();
  }, [stopAlarmSound]);

  const resolveReporterName = useCallback(async (dbInstance, uid) => {
    if (!uid) {
      return 'Anonymous Reporter';
    }

    try {
      const reporterRef = ref(dbInstance, `civilian/civilian account/${uid}`);
      const reporterSnapshot = await get(reporterRef);

      if (reporterSnapshot.exists()) {
        const reporterData = reporterSnapshot.val() || {};
        const firstName = reporterData.firstName || '';
        const lastName = reporterData.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();

        if (fullName) {
          return fullName;
        }

        if (reporterData.displayName) {
          return reporterData.displayName;
        }
      }
    } catch (error) {
      console.error('Error resolving reporter name:', {
        message: error.message,
        stack: error.stack,
        uid
      });
    }

    return 'Anonymous Reporter';
  }, []);

  const showBrowserNotification = useCallback(async (notificationPayload, options = {}) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    const backgroundOnly = options.backgroundOnly ?? false;
    const shouldSkipForForeground =
      backgroundOnly &&
      typeof document !== 'undefined' &&
      document.visibilityState !== 'hidden' &&
      document.hasFocus();

    if (shouldSkipForForeground) {
      return;
    }

    const buildBody = () => {
      if (Array.isArray(notificationPayload?.details) && notificationPayload.details.length > 0) {
        return notificationPayload.details
          .map(detail => `${detail?.label ?? 'Detail'}: ${detail?.value ?? 'N/A'}`)
          .join('\n');
      }
      return notificationPayload?.message
        || notificationPayload?.type
        || notificationPayload?.severity
        || 'New activity detected';
    };

    const display = () => {
      try {
        const nativeNotification = new Notification(
          String(notificationPayload?.title || 'New Alert'),
          {
            body: buildBody(),
            requireInteraction: true,
            tag: notificationPayload?.id || `alert-${Date.now()}`,
            data: notificationPayload
          }
        );

        nativeNotification.onclick = () => {
          window.focus();
          try {
            nativeNotification.close();
          } catch (error) {
            console.log('Could not close native notification:', error);
          }
        };
      } catch (error) {
        console.log('Unable to display native notification:', error);
      }
    };

    try {
      if (Notification.permission === 'granted') {
        display();
        return;
      }

      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          display();
        }
      }
    } catch (error) {
      console.log('Native notification request failed:', error);
    }
  }, []);

  const closeAlert = useCallback(() => {
    clearNotificationTimeout();
    setVisibleAlert(null);
    alertRef.current = null;
    stopAlarmSound();
  }, [clearNotificationTimeout, stopAlarmSound]);

  const triggerAlert = useCallback((notificationPayload) => {
    const normalizedAlert = {
      ...notificationPayload,
      duration: notificationPayload?.duration ?? null,
      timestamp: notificationPayload?.timestamp ?? Date.now()
    };

    alertRef.current = normalizedAlert;
    setVisibleAlert(normalizedAlert);

    clearNotificationTimeout();

    if (normalizedAlert.duration !== null) {
      notificationTimeoutRef.current = setTimeout(() => {
        closeAlert();
      }, normalizedAlert.duration || ALERT_AUTO_CLOSE_FALLBACK_MS);
    }

    if (alarmEnabledRef.current) {
      playAlarmSound();
    }

    showBrowserNotification(normalizedAlert, { backgroundOnly: true });
  }, [clearNotificationTimeout, closeAlert, playAlarmSound, showBrowserNotification]);

  useEffect(() => {
    alarmEnabledRef.current = alarmEnabled;
    if (!alarmEnabled) {
      stopAlarmSound();
    } else if (alertRef.current) {
      playAlarmSound();
    }
  }, [alarmEnabled, playAlarmSound, stopAlarmSound]);

  useEffect(() => {
    const db = getDatabase(app);
    const reportsRef = ref(db, 'civilian/civilian crime reports');

    const unsubscribe = onValue(reportsRef, (snapshot) => {
      try {
        if (!snapshot.exists()) {
          lastReportIdsRef.current = new Set();
          return;
        }

        const reportsData = snapshot.val();
        const reportsArray = Object.keys(reportsData).map(key => ({
          id: key,
          ...(reportsData[key] || {})
        }));

        reportsArray.sort((a, b) => new Date(b.dateTime || b.createdAt || 0) - new Date(a.dateTime || a.createdAt || 0));

        const currentIds = new Set(reportsArray.map(report => report.id));
        const previousIds = lastReportIdsRef.current;
        const newIds = new Set([...currentIds].filter(id => !previousIds.has(id)));

        if (newIds.size > 0 && previousIds.size > 0) {
          const newestId = Array.from(newIds)[0];
          const latestReport = reportsArray.find(report => report.id === newestId);

          if (latestReport) {
            (async () => {
              try {
                const reporterName = await resolveReporterName(db, latestReport.reporterUid);

                triggerAlert({
                  id: latestReport.id,
                  title: 'NEW CRIME REPORT',
                  severity: latestReport.severity,
                  source: 'crime',
                  duration: null,
                  details: [
                    { label: 'Crime Type', value: latestReport.crimeType || latestReport.type || 'Unknown' },
                    { label: 'Reported By', value: reporterName },
                    { label: 'Severity', value: (latestReport.severity?.toUpperCase?.() || 'UNKNOWN'), emphasize: true }
                  ]
                });
              } catch (error) {
                console.error('Failed to resolve reporter info for alert:', error);
                triggerAlert({
                  id: latestReport.id,
                  title: 'NEW CRIME REPORT',
                  severity: latestReport.severity,
                  source: 'crime',
                  duration: null,
                  details: [
                    { label: 'Crime Type', value: latestReport.crimeType || latestReport.type || 'Unknown' },
                    { label: 'Reported By', value: 'Anonymous Reporter' },
                    { label: 'Severity', value: (latestReport.severity?.toUpperCase?.() || 'UNKNOWN'), emphasize: true }
                  ]
                });
              }
            })();
          }
        } else if (previousIds.size === 0 && currentIds.size > 0) {
          console.log('GlobalAlertManager: initial crime report load', currentIds.size);
        }

        lastReportIdsRef.current = currentIds;
      } catch (error) {
        console.error('GlobalAlertManager: error processing crime reports', error);
      }
    }, (error) => {
      console.error('GlobalAlertManager: crime reports listener error', error);
    });

    return () => {
      off(reportsRef, 'value', unsubscribe);
    };
  }, [resolveReporterName, triggerAlert]);

  useEffect(() => {
    const db = getDatabase(app);
    const sosAlertsRef = ref(db, 'sos_alerts');

    const unsubscribe = onValue(sosAlertsRef, (snapshot) => {
      try {
        if (!snapshot.exists()) {
          lastSmartWatchAlertIdsRef.current = new Set();
          return;
        }

        const alertsData = snapshot.val();
        const alertsArray = Object.keys(alertsData).map(key => ({
          id: key,
          ...(alertsData[key] || {})
        }));

        const currentIds = new Set(alertsArray.map(alert => alert.id));
        const previousIds = lastSmartWatchAlertIdsRef.current;
        const newIds = new Set([...currentIds].filter(id => !previousIds.has(id)));

        if (newIds.size > 0 && previousIds.size > 0) {
          const newestId = Array.from(newIds)[0];
          const latestAlert = alertsArray.find(alert => alert.id === newestId);

          if (latestAlert) {
            (async () => {
              try {
                const reporterName = latestAlert.userName
                  || latestAlert.reporterName
                  || latestAlert.fullName
                  || await resolveReporterName(db, latestAlert.userId || latestAlert.user_id);

                const isWatch = typeof latestAlert.deviceType === 'string' && latestAlert.deviceType.toLowerCase().includes('watch');

                triggerAlert({
                  id: latestAlert.id,
                  title: isWatch ? 'NEW SMART WATCH SOS' : 'NEW SOS ALERT',
                  severity: latestAlert.severity,
                  source: 'sos',
                  duration: null,
                  details: [
                    { label: 'Alert Type', value: latestAlert.alertType || latestAlert.type || 'SOS Alert' },
                    { label: 'Triggered By', value: reporterName },
                    { label: 'Status', value: (latestAlert.status?.toUpperCase?.() || 'ACTIVE'), emphasize: true }
                  ]
                });
              } catch (error) {
                console.error('Failed to prepare SOS alert notification:', error);

                triggerAlert({
                  id: latestAlert.id,
                  title: 'NEW SOS ALERT',
                  severity: latestAlert.severity,
                  source: 'sos',
                  duration: null,
                  details: [
                    { label: 'Alert Type', value: latestAlert.alertType || latestAlert.type || 'SOS Alert' },
                    { label: 'Triggered By', value: latestAlert.userId || latestAlert.user_id || 'Unknown User' },
                    { label: 'Status', value: (latestAlert.status?.toUpperCase?.() || 'ACTIVE'), emphasize: true }
                  ]
                });
              }
            })();
          }
        } else if (previousIds.size === 0 && currentIds.size > 0) {
          console.log('GlobalAlertManager: initial SOS alert load', currentIds.size);
        }

        lastSmartWatchAlertIdsRef.current = currentIds;
      } catch (error) {
        console.error('GlobalAlertManager: error processing SOS alerts', error);
      }
    }, (error) => {
      console.error('GlobalAlertManager: SOS alerts listener error', error);
    });

    return () => {
      off(sosAlertsRef, 'value', unsubscribe);
    };
  }, [resolveReporterName, triggerAlert]);

  useEffect(() => () => {
    stopAlarmSound();
    clearNotificationTimeout();
  }, [clearNotificationTimeout, stopAlarmSound]);

  if (!visibleAlert) {
    return null;
  }

  const detailRows = visibleAlert.details && visibleAlert.details.length > 0
    ? visibleAlert.details
    : [
        {
          label: 'Details',
          value: visibleAlert.message
            || visibleAlert.type
            || visibleAlert.severity
            || 'New activity detected'
        }
      ];

  const getSeverityStyles = () => {
    const severity = (visibleAlert.severity || '').toString().toLowerCase();
    const source = (visibleAlert.source || '').toString().toLowerCase();
    const title = (visibleAlert.title || '').toString().toLowerCase();

    const isImmediate =
      severity === 'immediate' ||
      source === 'sos' ||
      title.includes('smart watch') ||
      title.includes('sos');

    if (isImmediate) {
      return {
        container: 'bg-[#ef4444]',
        badge: 'bg-white/20 text-white',
        foreground: 'text-white',
        detailLabel: 'text-white/80',
      };
    }

    if (severity === 'high') {
      return {
        container: 'bg-[#f97316]',
        badge: 'bg-white/20 text-white',
        foreground: 'text-white',
        detailLabel: 'text-white/85',
      };
    }

    if (severity === 'moderate' || severity === 'medium') {
      return {
        container: 'bg-[#facc15]',
        badge: 'bg-black/10 text-black',
        foreground: 'text-black',
        detailLabel: 'text-black/70',
      };
    }

    if (severity === 'low') {
      return {
        container: 'bg-[#22c55e]',
        badge: 'bg-white/20 text-white',
        foreground: 'text-white',
        detailLabel: 'text-white/80',
      };
    }

    return {
      container: 'bg-status-danger text-white',
      badge: 'bg-white/20 text-white',
      foreground: 'text-white',
      detailLabel: 'text-white/80',
    };
  };

  const severityStyles = getSeverityStyles();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6 py-10 bg-black bg-opacity-50">
      <div
        className={`relative w-full max-w-4xl p-12 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.35)] transition-colors duration-200 ${severityStyles.container}`}
      >
        <div className="flex items-start gap-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl font-extrabold ${severityStyles.badge}`}>
            !
          </div>
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <h3 className={`text-4xl font-black tracking-widest uppercase ${severityStyles.foreground}`}>
                {String(visibleAlert.title || 'New Alert').toUpperCase()}
              </h3>
              <button
                className="text-sm font-semibold uppercase tracking-[0.3em] bg-white/20 px-4 py-2 rounded-full hover:bg-white/30 transition text-white"
                onClick={() => setAlarmEnabled((prev) => !prev)}
              >
                {alarmEnabled ? 'Mute Siren' : 'Enable Siren'}
              </button>
            </div>
            <div className="mt-6 space-y-6 text-xl leading-relaxed">
              {detailRows.map((detail, index) => (
                <div key={`${detail?.label || 'detail'}-${index}`} className="flex flex-wrap justify-between gap-6">
                  <span className={`font-semibold uppercase tracking-[0.4em] ${severityStyles.detailLabel}`}>
                    {String(detail?.label || 'Detail').toUpperCase()}
                  </span>
                  <span className={`${detail?.emphasize ? 'font-black text-4xl' : 'font-extrabold text-2xl'} ${severityStyles.foreground}`}>
                    {String(detail?.value ?? 'N/A')}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button
            className="absolute top-8 right-10 text-white hover:text-gray-200 text-4xl font-black transition"
            onClick={closeAlert}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalAlertManager;

