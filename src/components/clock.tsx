import { useEffect, useState } from "react";

export default function Clock () {

const currentIST = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    timeStyle: 'medium'
    });

const [currentTime, setCurrentTime] = useState<String>(currentIST + ".");

useEffect(() => {

    const currentIST = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    timeStyle: 'medium'
    });

    const timer = setInterval(() => {
    setCurrentTime(currentIST);
    }, 1000);

    return () => clearInterval(timer);
}, [currentTime]);


return (
    <div className="text-2xl my-5 font-light">
        <p>{currentTime}</p>
    </div>
    )
}