import { useEffect, useState } from "react";

export default function Clock() {
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
    <div className="text-xl my-5 font-light">
      <p suppressHydrationWarning={true}>{currentTime}</p>
    </div>
  );
}