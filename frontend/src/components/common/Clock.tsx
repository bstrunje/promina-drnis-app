import { useState, useEffect } from 'react';

const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, []);

  return (
    <div className="hidden md:block fixed top-4 right-4 bg-gray-900 bg-opacity-80 text-white p-2 rounded-lg shadow-lg z-[9999] backdrop-blur-sm">
      <span className="font-mono text-base tracking-wider">
        {time.toLocaleTimeString('hr-HR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </span>
    </div>
  );
};

export default Clock;