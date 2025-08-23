import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Key, TestTube, AlertCircle, CheckCircle, ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface BithumbApiKeys {
  connectKey: string;
  secretKey: string;
  api2Key: string;
  apiVersion: string;
}

interface TestResult {
  success: boolean;
  message: string;
}

interface ServiceConfig {
  [key: string]: {
    label: string;
    required: boolean;
    maxLength?: number;
    options?: string[];
  };
}

interface AllApiKeys {
  [service: string]: {
    [key: string]: string;
  };
}

interface ServicesResponse {
  services: string[];
  configs: {
    [service: string]: ServiceConfig;
  };
}

export default function ApiSettings() {
  const [selectedService, setSelectedService] = useState<string>("bithumb");
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({
    bithumb: true
  });
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const [showKeys, setShowKeys] = useState<Record<string, Record<string, boolean>>>({});

  const queryClient = useQueryClient();

  // 모든 서비스 정보 조회
  const { data: servicesData, isLoading: servicesLoading } = useQuery<ServicesResponse>({
    queryKey: ['/api/api-keys/services'],
  });

  // 모든 API key 조회
  const { data: allApiKeys, isLoading: keysLoading } = useQuery<AllApiKeys>({
    queryKey: ['/api/api-keys'],
  });

  // 서비스별 API key 업데이트
  const updateMutation = useMutation({
    mutationFn: async ({ service, data }: { service: string; data: any }) => {
      const url = service === 'bithumb' ? '/api/bithumb/api-keys' : `/api/api-keys/${service}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update API keys');
      }
      return response.json();
    },
    onSuccess: (result, variables) => {
      toast({
        title: "성공",
        description: result.message || "API Key가 성공적으로 업데이트되었습니다.",
      });
      setFormData(prev => ({ ...prev, [variables.service]: {} }));
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      if (variables.service === 'bithumb') {
        queryClient.invalidateQueries({ queryKey: ['/api/bithumb/api-keys'] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // API 연결 테스트
  const testMutation = useMutation({
    mutationFn: async (service: string) => {
      const url = service === 'bithumb' ? '/api/bithumb/test-connection' : `/api/api-keys/${service}/test`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Failed to test connection');
      }
      return response.json() as Promise<TestResult>;
    },
    onSuccess: (result) => {
      toast({
        title: result.success ? "연결 성공" : "연결 실패",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "API 연결 테스트에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (service: string) => (e: React.FormEvent) => {
    e.preventDefault();
    
    const serviceFormData = formData[service] || {};
    const updates: any = {};
    
    Object.keys(serviceFormData).forEach(key => {
      if (serviceFormData[key] && serviceFormData[key].trim()) {
        updates[key] = serviceFormData[key].trim();
      }
    });
    
    if (Object.keys(updates).length === 0) {
      toast({
        title: "알림",
        description: "변경할 API Key를 입력하세요.",
        variant: "destructive",
      });
      return;
    }
    
    updateMutation.mutate({ service, data: updates });
  };

  const toggleShowKey = (service: string, keyType: string) => {
    setShowKeys(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        [keyType]: !prev[service]?.[keyType]
      }
    }));
  };

  const updateFormData = (service: string, key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        [key]: value
      }
    }));
  };

  const toggleServiceExpanded = (service: string) => {
    setExpandedServices(prev => ({
      ...prev,
      [service]: !prev[service]
    }));
  };

  const getServiceDisplayName = (service: string) => {
    const names: Record<string, string> = {
      bithumb: '빗썸 (Bithumb)',
      firebase: 'Firebase',
      binance: '바이낸스 (Binance)',
      coinGecko: 'CoinGecko',
      openExchangeRates: 'Open Exchange Rates'
    };
    return names[service] || service;
  };

  if (servicesLoading || keysLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              대시보드로 돌아가기
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Key className="h-6 w-6" />
          <h1 className="text-2xl font-bold">API 키 관리</h1>
        </div>

        {/* 서비스별 API Key 관리 */}
        <div className="space-y-4">
          {servicesData?.services.map((service) => {
            const serviceConfig = servicesData.configs[service];
            const serviceKeys = allApiKeys?.[service] || {};
            const isExpanded = expandedServices[service];
            
            return (
              <Card key={service}>
                <Collapsible 
                  open={isExpanded} 
                  onOpenChange={() => toggleServiceExpanded(service)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Key className="h-5 w-5" />
                          <div>
                            <CardTitle className="text-lg">{getServiceDisplayName(service)}</CardTitle>
                            <CardDescription>
                              {service === 'bithumb' && `API ${serviceKeys.apiVersion || '1.0'} 버전`}
                              {service === 'firebase' && 'Firebase 실시간 환율 서비스'}
                              {service === 'binance' && 'Binance 거래소 API'}
                              {service === 'coinGecko' && 'CoinGecko 가격 데이터 API'}
                              {service === 'openExchangeRates' && '환율 데이터 API'}
                            </CardDescription>
                          </div>
                        </div>
                        {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="space-y-6">
                      {/* 현재 설정된 키 표시 */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground">현재 설정된 키</h4>
                        {Object.keys(serviceConfig).map((key) => {
                          const config = serviceConfig[key];
                          const currentValue = serviceKeys[key] || '';
                          
                          if (key === 'apiVersion' && service === 'bithumb') {
                            return (
                              <div key={key}>
                                <Label>{config.label}</Label>
                                <div className="mt-1">
                                  <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                    {currentValue || '1.0'}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div key={key}>
                              <Label>{config.label}</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Input
                                  value={showKeys[service]?.[key] ? currentValue.replace(/\*/g, '●') : currentValue}
                                  readOnly
                                  className="font-mono text-sm"
                                  placeholder={currentValue ? "" : "설정되지 않음"}
                                />
                                {currentValue && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleShowKey(service, key)}
                                  >
                                    {showKeys[service]?.[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* API 연결 테스트 */}
                      <Button
                        onClick={() => testMutation.mutate(service)}
                        disabled={testMutation.isPending}
                        variant="outline"
                        className="w-full"
                      >
                        {testMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4 mr-2" />
                        )}
                        {getServiceDisplayName(service)} 연결 테스트
                      </Button>

                      {/* 키 변경 폼 */}
                      <div className="pt-4 border-t">
                        <h4 className="font-medium mb-4">키 변경</h4>
                        <form onSubmit={handleSubmit(service)} className="space-y-4">
                          {Object.keys(serviceConfig).map((key) => {
                            const config = serviceConfig[key];
                            
                            if (key === 'apiVersion' && service === 'bithumb' && config.options) {
                              return (
                                <div key={key}>
                                  <Label htmlFor={`${service}-${key}`}>{config.label}</Label>
                                  <Select
                                    value={formData[service]?.[key] || ''}
                                    onValueChange={(value) => updateFormData(service, key, value)}
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder={`${config.label} 선택`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {config.options.map((option) => (
                                        <SelectItem key={option} value={option}>
                                          API {option} 버전
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              );
                            }
                            
                            return (
                              <div key={key}>
                                <Label htmlFor={`${service}-${key}`}>
                                  {config.label} {config.maxLength && `(${config.maxLength}자리)`}
                                </Label>
                                <Input
                                  id={`${service}-${key}`}
                                  type="text"
                                  placeholder={`새로운 ${config.label}를 입력하세요`}
                                  value={formData[service]?.[key] || ''}
                                  onChange={(e) => updateFormData(service, key, e.target.value)}
                                  className="font-mono mt-1"
                                  maxLength={config.maxLength}
                                />
                                {config.maxLength && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    현재: {formData[service]?.[key]?.length || 0}/{config.maxLength}자
                                  </p>
                                )}
                              </div>
                            );
                          })}

                          <Button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="w-full"
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            {getServiceDisplayName(service)} API Key 업데이트
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}