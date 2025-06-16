
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ApiConfigurationProps {
  apiKey: string;
  baseUrl?: string;
  needsBaseUrl: boolean;
  placeholder: string;
  onApiKeyChange: (value: string) => void;
  onBaseUrlChange: (value: string) => void;
}

const ApiConfiguration: React.FC<ApiConfigurationProps> = ({
  apiKey,
  baseUrl,
  needsBaseUrl,
  placeholder,
  onApiKeyChange,
  onBaseUrlChange
}) => {
  return (
    <>
      <div>
        <Label htmlFor="apiKey" className="text-slate-700 font-medium">API密钥</Label>
        <Input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="输入您的API密钥"
          className="mt-2 bg-white border-slate-300 text-slate-800"
        />
      </div>

      {needsBaseUrl && (
        <div>
          <Label htmlFor="baseUrl" className="text-slate-700 font-medium">API基础URL</Label>
          <Input
            id="baseUrl"
            value={baseUrl || ''}
            onChange={(e) => onBaseUrlChange(e.target.value)}
            placeholder={placeholder}
            className="mt-2 bg-white border-slate-300 text-slate-800"
          />
        </div>
      )}
    </>
  );
};

export default ApiConfiguration;
