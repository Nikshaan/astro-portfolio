import { useEffect, useState, memo } from "react";

const Clock = memo(function Clock() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const updateTime = () => {
      const currentIST = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        timeStyle: 'medium'
      });
      setCurrentTime(currentIST);
    };

    updateTime();

    const timer = setInterval(() => {
      updateTime();
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!isMounted) {
    return (
      <div className="text-2xl my-5 font-light">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="font-light text-center my-1">
      <p className="text-nowrap text-2xl md:text-lg" suppressHydrationWarning={true}>{currentTime}</p>
    </div>
  );
});

export default Clock;