import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action } from '@/features/records/ui';
import { colors, styles } from '@/design/styles';
import { StartProvider } from './provider';
import { createFirstRunTestRepository, deviceStartRepository, type StartRepository } from './repository';
import { PreparationProvider } from '../preparation/provider';

type TestSession = { active: boolean; session: number; begin: () => void; end: () => void };
const TestContext = createContext<TestSession | null>(null);

export function FirstRunTestHost({ children }: { children: ReactNode }) {
  const [testRepository, setTestRepository] = useState<StartRepository | null>(null);
  const [session, setSession] = useState(0);
  const active = useRef(false);
  function begin() {
    if (!__DEV__ || active.current) return;
    active.current = true;
    setTestRepository(createFirstRunTestRepository(__DEV__));
    setSession(value => value + 1);
  }
  function end() {
    if (!__DEV__ || !active.current) return;
    active.current = false;
    setTestRepository(null);
    setSession(value => value + 1);
  }
  return <TestContext.Provider value={{ active: __DEV__ && !!testRepository, session, begin, end }}>
    <StartProvider key={session} repository={testRepository ?? deviceStartRepository}>
      <PreparationProvider key={session} testing={__DEV__&&!!testRepository}><View style={{ flex: 1 }}>
        {children}
        {__DEV__ && !!testRepository && <SafeAreaView edges={['bottom', 'left', 'right']} style={{ backgroundColor: colors.pale }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 8, gap: 4 }}>
            <Text style={styles.secondary}>첫 실행 흐름 테스트, 선택은 임시로만 적용돼요.</Text>
            <Action label="테스트 종료, 기존 상태로 돌아가기" secondary onPress={end} />
          </View>
        </SafeAreaView>}
      </View></PreparationProvider>
    </StartProvider>
  </TestContext.Provider>;
}

export function useFirstRunTest() {
  const session = useContext(TestContext);
  if (!session) throw new Error('FirstRunTestHost required');
  return session;
}
