import { Router } from "@reach/router";
import Swap from "./pages/Swap";

const App = (props: any) => {
  return (
    <Router>
      <Swap path="/:action" />
      <Swap path="/" />
    </Router>
  );
};

export default App;
