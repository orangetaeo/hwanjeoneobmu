import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "@/pages/HomePage";
import BithumbSettings from "@/pages/BithumbSettings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/new-transaction" component={HomePage} />
      <Route path="/complex-transaction" component={HomePage} />
      <Route path="/assets" component={HomePage} />
      <Route path="/exchange-operations" component={HomePage} />
      <Route path="/transactions" component={HomePage} />
      <Route path="/rates" component={HomePage} />
      <Route path="/exchange-rates" component={HomePage} />
      <Route path="/bithumb-settings" component={BithumbSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
