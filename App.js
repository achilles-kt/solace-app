import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Coins, Heart, MessageCircle } from 'lucide-react-native';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// --- SUPABASE SETUP ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// REPLACE WITH YOUR KEYS
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
const OPENAI_API_KEY = ''; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

const THEME = {
  background: '#121212',
  surface: '#1E1E1E',
  primary: '#D4AF37', 
  text: '#E0E0E0',
  textSecondary: '#A0A0A0',
  danger: '#CF6679',
  success: '#03DAC6',
};

// --- DATA ---
const INITIAL_PERSONAS = [
  { 
    id: '1', name: 'Priya', tagline: 'Warm listener', desc: 'I am here to listen without judgment.',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80',
    pricePerMin: 10,
  },
  { 
    id: '2', name: 'Ananya', tagline: 'Fun & flirty', desc: 'Let’s forget about work for a while.',
    image: 'https://images.unsplash.com/photo-1596205844976-7494ccb19129?w=600&q=80',
    pricePerMin: 15,
  },
  { 
    id: '3', name: 'Meera', tagline: 'Calm & Mature', desc: 'A quiet space for deep conversations.',
    image: 'https://images.unsplash.com/photo-1621784563330-caee0b138a00?w=600&q=80',
    pricePerMin: 10,
  },
];

const COIN_PACKS = [
  { id: '1', amount: 100, price: '₹99', tag: '' },
  { id: '2', amount: 500, price: '₹399', tag: 'Best Value' },
  { id: '3', amount: 1000, price: '₹699', tag: '+10% Free' },
];

// --- CONTEXT ---
const AppContext = createContext();

const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0); 
  const [isLoading, setIsLoading] = useState(true);

  // 1. Session Check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if(session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false); // No user, show Onboarding
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      if(session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });
  }, []);

  // 2. Fetch User Coins
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .single();
      
      if (data) setCoins(data.coins);
      if (error && error.code !== 'PGRST116') console.error('Error fetching profile:', error);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCoins = async (newAmount) => {
    setCoins(newAmount); 
    if (!user) return;
    await supabase.from('profiles').update({ coins: newAmount }).eq('id', user.id);
  };

  const addCoins = (amount) => updateCoins(coins + amount);
  const deductCoins = (amount) => {
    if (coins >= amount) {
      updateCoins(coins - amount);
      return true;
    }
    return false;
  };

  // 3. ANONYMOUS LOGIN FUNCTION
  const loginAnonymously = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
        Alert.alert("Error", "Could not sign in. Please try again.");
        setIsLoading(false);
    }
    // Context listener will handle the transition to Lobby
  };

  return (
    <AppContext.Provider value={{ 
      user, coins, isLoading, addCoins, deductCoins, loginAnonymously 
    }}>
      {children}
    </AppContext.Provider>
  );
};

// --- COMPONENTS ---

// 1. ONBOARDING SCREEN (Device Login)
const OnboardingScreen = () => {
  const { loginAnonymously, isLoading } = useContext(AppContext);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContent}>
        <View style={styles.brandContainer}>
          <Heart fill={THEME.primary} color={THEME.primary} size={60} />
          <Text style={styles.titleBig}>Solace</Text>
        </View>

        <Text style={styles.subtitle}>Find warmth, comfort, and someone to talk to.</Text>
        
        <TouchableOpacity style={styles.btnPrimary} onPress={loginAnonymously} disabled={isLoading}>
           {isLoading ? (
             <ActivityIndicator color="black" /> 
           ) : (
             <Text style={styles.btnText}>Start Journey</Text>
           )}
        </TouchableOpacity>
        
        <Text style={styles.caption}>Secure • Anonymous • Private</Text>
      </View>
    </SafeAreaView>
  );
};

// 2. Lobby (Unchanged)
const LobbyScreen = ({ navigation }) => {
  const { coins } = useContext(AppContext);

  const renderPersona = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.9}
      onPress={() => navigation.navigate('Chat', { persona: item })}
    >
      <Image source={{ uri: item.image }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardTag}>{item.tagline}</Text>
        <View style={styles.cardActions}>
          <View style={styles.actionBtn}>
            <MessageCircle size={16} color={THEME.background} />
            <Text style={styles.actionBtnText}>Chat ({item.pricePerMin}c/min)</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.miniLogo}>
            <Heart fill={THEME.primary} color={THEME.primary} size={18} />
          </View>
          <Text style={styles.headerBrand}>Solace</Text>
        </View>
        <TouchableOpacity style={styles.coinBadge} onPress={() => navigation.navigate('Store')}>
          <Coins size={16} color={THEME.background} />
          <Text style={styles.coinText}>{coins}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={INITIAL_PERSONAS}
        renderItem={renderPersona}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

// 3. Chat Screen (Persisted & AI Connected)
const ChatScreen = ({ route, navigation }) => {
  const { persona } = route.params;
  const { user, coins, deductCoins } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const flatListRef = useRef();

  useEffect(() => {
    const loadHistory = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('persona_id', persona.id)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        setMessages(data.map(m => ({ id: m.id.toString(), text: m.text, sender: m.sender })));
      } else {
        setMessages([{ id: '0', text: `Hi! I'm ${persona.name}. ${persona.desc}`, sender: 'ai' }]);
      }
    };
    loadHistory();
  }, [user.id, persona.id]);

  useEffect(() => {
    const interval = setInterval(() => {
        setTimeSpentSeconds(prev => {
            const nextVal = prev + 1;
            if (nextVal > 0 && nextVal % 60 === 0) {
                 const success = deductCoins(persona.pricePerMin);
                 if (!success) {
                     clearInterval(interval);
                     Alert.alert("Out of Coins", "Please recharge.", [
                         { text: "Store", onPress: () => navigation.navigate('Store') },
                         { text: "Leave", onPress: () => navigation.goBack() }
                     ]);
                 }
            }
            return nextVal;
        });
    }, 1000);
    return () => clearInterval(interval);
  }, [coins]); 

  const sendMessage = async () => {
    if (!input.trim()) return;
    const tempId = Date.now().toString();
    const userMsg = { id: tempId, text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    await supabase.from('messages').insert({
        user_id: user.id,
        persona_id: persona.id,
        text: userMsg.text,
        sender: 'user'
    });

    try {
      let aiText = "";
      const historyContext = messages.slice(-10).map(m => ({ 
          role: m.sender === 'user' ? 'user' : 'assistant', 
          content: m.text 
      }));

      if (OPENAI_API_KEY) {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: `You are ${persona.name}, ${persona.tagline}. Be warm, flirty. Keep replies short.` },
              ...historyContext,
              { role: "user", content: input }
            ]
          })
        });
        const data = await response.json();
        aiText = data.choices?.[0]?.message?.content || "...";
      } else {
        await new Promise(r => setTimeout(r, 1500));
        aiText = "I'm listening... tell me more!";
      }

      const { data: aiDbMsg } = await supabase.from('messages').insert({
        user_id: user.id,
        persona_id: persona.id,
        text: aiText,
        sender: 'ai'
      }).select().single();

      const aiMsg = { id: aiDbMsg ? aiDbMsg.id.toString() : Date.now().toString(), text: aiText, sender: 'ai' };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color={THEME.text} size={28} />
        </TouchableOpacity>
        <Image source={{ uri: persona.image }} style={styles.headerAvatar} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>{persona.name}</Text>
          <Text style={styles.statusText}>Session: {Math.floor(timeSpentSeconds / 60)}m {timeSpentSeconds % 60}s</Text>
        </View>
        <View style={styles.coinBadge}><Text style={styles.coinText}>{coins}c</Text></View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View style={[styles.msgBubble, item.sender === 'user' ? styles.msgUser : styles.msgAi]}>
            <Text style={item.sender === 'user' ? styles.msgTextUser : styles.msgTextAi}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
      {isTyping && <Text style={styles.typingIndicator}>{persona.name} is typing...</Text>}
      <View style={styles.inputArea}>
        <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Type a message..." placeholderTextColor="#666" />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}><Text style={styles.sendBtnText}>Send</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// 4. Store (Unchanged)
const StoreScreen = ({ navigation }) => {
  const { coins, addCoins } = useContext(AppContext);
  const [showReward, setShowReward] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const buyPack = (pack) => {
    Alert.alert("Purchase", `Buy ${pack.amount} coins?`, [
      { text: "Cancel" },
      { text: "Buy", onPress: () => { addCoins(pack.amount); triggerReward(); }}
    ]);
  };

  const triggerReward = () => {
    setShowReward(true);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true })
      ]),
      Animated.delay(1000),
      Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true })
    ]).start(() => setShowReward(false));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color={THEME.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coin Store</Text>
      </View>
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceValue}>{coins} Coins</Text>
      </View>
      <FlatList
        data={COIN_PACKS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.packCard} onPress={() => buyPack(item)}>
            <View><Text style={styles.packAmount}>{item.amount} Coins</Text></View>
            <View style={styles.priceBtn}><Text style={styles.priceText}>{item.price}</Text></View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
      <RewardModal visible={showReward} amount="+" scale={scaleAnim} opacity={fadeAnim} />
    </SafeAreaView>
  );
};

const RewardModal = ({ visible, amount, scale, opacity }) => (
  <Modal visible={visible} transparent animationType="none">
    <View style={styles.rewardOverlay}>
      <Animated.View style={[styles.rewardCard, { opacity: opacity, transform: [{ scale: scale }] }]}>
        <Text style={{ fontSize: 80 }}>💰</Text>
        <Text style={styles.rewardTitle}>Coins Added!</Text>
      </Animated.View>
    </View>
  </Modal>
);

// --- NAVIGATION ---
const Stack = createStackNavigator();

export default function App() {
  return (
    <AppProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer>
           <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </AppProvider>
  );
}

const RootNavigator = () => {
  const { user, isLoading } = useContext(AppContext);

  if (isLoading) return (
    <View style={{flex:1, backgroundColor: THEME.background, justifyContent:'center', alignItems:'center'}}>
      <ActivityIndicator size="large" color={THEME.primary} />
    </View>
  );

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Lobby" component={LobbyScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Store" component={StoreScreen} presentation="modal" />
        </>
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      )}
    </Stack.Navigator>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  brandContainer: { alignItems: 'center', marginBottom: 20 },
  titleBig: { fontSize: 40, fontWeight: 'bold', color: THEME.primary, marginTop: 10 },
  subtitle: { fontSize: 18, color: THEME.textSecondary, textAlign: 'center', marginBottom: 30 },
  caption: { fontSize: 14, color: '#555', marginTop: 20 },

  btnPrimary: { backgroundColor: THEME.primary, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 30, width: '100%', alignItems: 'center', marginTop: 10 },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 18 },
  
  rewardOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  rewardCard: { backgroundColor: THEME.surface, padding: 40, borderRadius: 30, alignItems: 'center', borderWidth: 2, borderColor: THEME.primary },
  rewardTitle: { fontSize: 32, fontWeight: 'bold', color: THEME.primary, marginTop: 10 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333', backgroundColor: THEME.surface },
  miniLogo: { marginRight: 8 },
  headerBrand: { fontSize: 24, fontWeight: 'bold', color: THEME.text, letterSpacing: 1 },
  coinBadge: { backgroundColor: THEME.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  coinText: { color: '#000', fontWeight: 'bold', marginLeft: 6 },
  
  card: { backgroundColor: THEME.surface, borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  cardImage: { width: '100%', height: 350 },
  cardContent: { padding: 16 },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: THEME.text },
  cardTag: { fontSize: 16, color: THEME.primary, marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, backgroundColor: THEME.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 8, gap: 8 },
  actionBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },

  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginLeft: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: THEME.text },
  statusText: { color: THEME.textSecondary, fontSize: 12 },
  msgBubble: { padding: 12, borderRadius: 12, marginBottom: 10, maxWidth: '80%' },
  msgUser: { backgroundColor: THEME.primary, alignSelf: 'flex-end' },
  msgAi: { backgroundColor: '#333', alignSelf: 'flex-start' },
  msgTextUser: { color: '#000', fontSize: 16 },
  msgTextAi: { color: '#fff', fontSize: 16 },
  inputArea: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#333', backgroundColor: THEME.surface },
  input: { flex: 1, backgroundColor: '#121212', color: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10 },
  sendBtn: { backgroundColor: THEME.primary, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 20 },
  sendBtnText: { color: '#000', fontWeight: 'bold' },
  typingIndicator: { marginLeft: 16, marginBottom: 10, color: '#666', fontStyle: 'italic' },

  balanceContainer: { backgroundColor: '#333', padding: 20, margin: 16, borderRadius: 12, alignItems: 'center' },
  balanceLabel: { color: '#aaa', fontSize: 14 },
  balanceValue: { color: THEME.primary, fontSize: 32, fontWeight: 'bold', marginTop: 8 },
  packCard: { backgroundColor: THEME.surface, padding: 20, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packAmount: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  priceBtn: { backgroundColor: THEME.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  priceText: { fontWeight: 'bold', color: '#000' }
});