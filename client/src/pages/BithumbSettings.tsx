import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Key, TestTube, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BithumbApiKeys {
  connectKey: string;
  secretKey: string;
  api2Key: string;
}

interface TestResult {
  success: boolean;
  message: string;
}

export default function BithumbSettings() {
  const [formData, setFormData] = useState({
    connectKey: "",
    secretKey: "",
    api2Key: ""
  });
  
  const [showKeys, setShowKeys] = useState({
    connectKey: false,
    secretKey: false,
    api2Key: false
  });

  const queryClient = useQueryClient();

  // 현재 API key 조회
  const { data: apiKeys, isLoading } = useQuery<BithumbApiKeys>({
    queryKey: ['/api/bithumb/api-keys'],
  });

  // API key 업데이트
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<BithumbApiKeys>) => {
      const response = await fetch('/api/bithumb/api-keys', {
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
    onSuccess: () => {
      toast({
        title: "성공",
        description: "API Key가 성공적으로 업데이트되었습니다.",
      });
      setFormData({ connectKey: "", secretKey: "", api2Key: "" });
      queryClient.invalidateQueries({ queryKey: ['/api/bithumb/api-keys'] });
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
    mutationFn: async () => {
      const response = await fetch('/api/bithumb/test-connection', {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 변경할 필드만 포함
    const updates: Partial<BithumbApiKeys> = {};
    if (formData.connectKey.trim()) updates.connectKey = formData.connectKey.trim();
    if (formData.secretKey.trim()) updates.secretKey = formData.secretKey.trim();
    if (formData.api2Key.trim()) updates.api2Key = formData.api2Key.trim();
    
    if (Object.keys(updates).length === 0) {
      toast({
        title: "알림",
        description: "변경할 API Key를 입력하세요.",
        variant: "destructive",
      });
      return;
    }
    
    updateMutation.mutate(updates);
  };

  const toggleShowKey = (keyType: keyof typeof showKeys) => {
    setShowKeys(prev => ({ ...prev, [keyType]: !prev[keyType] }));
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-bold">빗썸 API 설정</h1>
        </div>

        {/* 현재 API Key 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              현재 설정된 API Key
            </CardTitle>
            <CardDescription>
              보안을 위해 일부만 표시됩니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Connect Key (32자리)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={showKeys.connectKey ? apiKeys?.connectKey.replace(/\*/g, '●') || '' : apiKeys?.connectKey || ''}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleShowKey('connectKey')}
                  >
                    {showKeys.connectKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>Secret Key (32자리)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={showKeys.secretKey ? apiKeys?.secretKey.replace(/\*/g, '●') || '' : apiKeys?.secretKey || ''}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleShowKey('secretKey')}
                  >
                    {showKeys.secretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>API 2.0 Key (48자리)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={showKeys.api2Key ? apiKeys?.api2Key.replace(/\*/g, '●') || '' : apiKeys?.api2Key || ''}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleShowKey('api2Key')}
                  >
                    {showKeys.api2Key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
                variant="outline"
                className="w-full"
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                API 연결 테스트
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Key 변경 폼 */}
        <Card>
          <CardHeader>
            <CardTitle>API Key 변경</CardTitle>
            <CardDescription>
              새로운 API Key를 입력하여 변경할 수 있습니다. 변경하지 않을 항목은 비워두세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                빗썸에서 발급받은 정확한 API Key를 입력하세요. 잘못된 키를 입력하면 거래소 연동이 되지 않습니다.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="connectKey">Connect Key (32자리)</Label>
                <Input
                  id="connectKey"
                  type="text"
                  placeholder="새로운 Connect Key를 입력하세요"
                  value={formData.connectKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, connectKey: e.target.value }))}
                  className="font-mono"
                  maxLength={32}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  현재: {formData.connectKey.length}/32자
                </p>
              </div>

              <div>
                <Label htmlFor="secretKey">Secret Key (32자리)</Label>
                <Input
                  id="secretKey"
                  type="text"
                  placeholder="새로운 Secret Key를 입력하세요"
                  value={formData.secretKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, secretKey: e.target.value }))}
                  className="font-mono"
                  maxLength={32}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  현재: {formData.secretKey.length}/32자
                </p>
              </div>

              <div>
                <Label htmlFor="api2Key">API 2.0 Key (48자리)</Label>
                <Input
                  id="api2Key"
                  type="text"
                  placeholder="새로운 API 2.0 Key를 입력하세요"
                  value={formData.api2Key}
                  onChange={(e) => setFormData(prev => ({ ...prev, api2Key: e.target.value }))}
                  className="font-mono"
                  maxLength={48}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  현재: {formData.api2Key.length}/48자
                </p>
              </div>

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
                API Key 업데이트
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}