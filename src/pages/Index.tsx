
import StoryManager from '@/components/StoryManager';
import { UserHeader } from '@/components/auth/UserHeader';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      <div className="container mx-auto">
        <StoryManager />
      </div>
    </div>
  );
};

export default Index;
