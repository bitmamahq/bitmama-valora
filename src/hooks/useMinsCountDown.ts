import { parseISO } from "date-fns";
import { useEffect, useRef, useState } from "react";

const useMinsCountDown = (isoDate:string, initial = "", deactivate?:boolean) => {
  const [timer, setTimer] = useState(initial);
  const [expired, setExpired] = useState(false);

  const time = parseISO(isoDate).getTime();
  const intRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if(!deactivate) {
      intRef.current = setInterval(function () {
        // Get today's date and time
        const now = new Date().getTime();
        // Find the distance between now and the count down date
        const distance = time - now;
        // Time calculations for days, hours, minutes and seconds
  
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        // Display the result in the element with id="demo"
        setTimer(
          `${String(minutes).length < 2 ? "0" : ""}${minutes}m : ${
            String(seconds).length < 2 ? "0" : ""
          }${seconds}s`
        );
        // If the count down is finished, write some text
        if (distance < 0) {
          intRef.current && clearInterval(intRef.current);
          setTimer("TIMED OUT");
          setExpired(true);
        }
      }, 1000);
  
      return () => {
        if(intRef.current) clearInterval(intRef.current);
      }
    } else {
      if(intRef.current) clearInterval(intRef.current);
    }
    // eslint-disable-next-line
  }, [deactivate]);

  return { timer, expired };
};

export default useMinsCountDown;
