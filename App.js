import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Coins, Lock, Play, Users, X } from 'lucide-react-native';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform, Share,
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

// CREDENTIALS
const SUPABASE_URL = 'https://mqlotxgafucybdlagpgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xbG90eGdhZnVjeWJkbGFncGduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0Mjc4NjMsImV4cCI6MjA4MDAwMzg2M30.fSH9VRQRQjmeXBOaOFA9DugL0-BpVDjYFZu-GepTC1Q';

// YOUR API KEY
const OPENAI_API_KEY = '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'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

const THEME = {
  background: '#000000',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  gradientColors: ['#D4AF37', '#800080', '#0000FF'], // Gold -> Purple -> Blue
  surface: '#121212',
};

const COIN_PACKS = [
  { id: '1', amount: 100, price: '₹99' },
  { id: '2', amount: 500, price: '₹399' },
  { id: '3', amount: 1000, price: '₹699' },
  { id: '4', amount: 2500, price: '₹1499' },
];

const AppContext = createContext();

const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0); 
  const [agents, setAgents] = useState([]);
  const [loadingStep, setLoadingStep] = useState(0); 
  const [lowBalanceVisible, setLowBalanceVisible] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      setLoadingStep(1); 
      const { data: { session } } = await supabase.auth.getSession();
      
      if(session?.user) {
        setUser(session.user);
        await fetchData(session.user.id);
      } else {
        setLoadingStep(3); 
      }
    };
    initApp();

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if(session?.user) {
        setUser(session.user);
        await fetchData(session.user.id);
      } else {
        setUser(null);
      }
    });
  }, []);

  const fetchData = async (userId) => {
    setLoadingStep(2); 
    
    // 1. GET OR CREATE PROFILE
    let { data: profile, error } = await supabase.from('profiles').select('coins').eq('id', userId).single();
    
    if (!profile) {
      console.log("Creating new profile...");
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([{ id: userId, coins: 30 }])
        .select()
        .single();
        
      if (newProfile) setCoins(newProfile.coins);
      if (insertError) console.error("Profile creation failed:", insertError);
    } else {
      setCoins(profile.coins);
    }

    // 2. GET AGENTS
    const { data: agentsData } = await supabase.from('agents').select('*').eq('is_active', true);
    if (agentsData && agentsData.length > 0) {
      setAgents(agentsData);
    } else {
       setAgents([
         { id: 99, name: 'Setup Needed', tagline: 'Run SQL Script', image_url: 'https://via.placeholder.com/150', price_per_min: 0, system_prompt: '' }
       ]);
    }

    setLoadingStep(3); 
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
    } else {
      setLowBalanceVisible(true);
      return false;
    }
  };

  const loginAnonymously = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) Alert.alert("Connection Error", error.message);
  };

  return (
    <AppContext.Provider value={{ 
      user, coins, agents, loadingStep, 
      addCoins, deductCoins, loginAnonymously,
      lowBalanceVisible, setLowBalanceVisible
    }}>
      {children}
    </AppContext.Provider>
  );
};

const GradientBtn = ({ onPress, text, style, disabled }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[{ width: '100%' }, style]} disabled={disabled}>
    <LinearGradient
      colors={disabled ? ['#333', '#333'] : THEME.gradientColors}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={styles.gradientBtn}
    >
      <Text style={[styles.btnText, disabled && { color: '#666' }]}>{text}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

const LowBalanceNudge = () => {
  const { lowBalanceVisible, setLowBalanceVisible, addCoins } = useContext(AppContext);
  return (
    <Modal visible={lowBalanceVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <LinearGradient colors={['#1a1a1a', '#000']} style={styles.nudgeCard}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setLowBalanceVisible(false)}>
            <X color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.nudgeTitle}>Running Low?</Text>
          <View style={styles.dealBox}>
            <Text style={styles.dealText}>Special Offer</Text>
            <Text style={styles.dealPrice}>₹50 / 60 Coins</Text>
          </View>
          <GradientBtn text="Get Deal Now" onPress={() => { addCoins(60); setLowBalanceVisible(false); }} />
        </LinearGradient>
      </View>
    </Modal>
  );
};

const SplashScreen = ({ navigation }) => {
  const { loadingStep, user } = useContext(AppContext);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loadBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();

    Animated.timing(loadBarAnim, {
      toValue: loadingStep * 33, 
      duration: 500,
      useNativeDriver: false
    }).start();

    if (loadingStep === 3) {
      setTimeout(() => {
        navigation.replace(user ? 'Lobby' : 'Onboarding');
      }, 500);
    }
  }, [loadingStep]);

  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <LinearGradient colors={THEME.gradientColors} style={styles.logoBox}>
            <Text style={{ fontSize: 40, fontWeight: 'bold', color: '#fff' }}>W</Text>
          </LinearGradient>
        </Animated.View>
        <View style={styles.loadTrack}>
          <Animated.View style={[styles.loadFill, { width: loadBarAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </View>
    </View>
  );
};

const OnboardingScreen = () => {
  const { loginAnonymously } = useContext(AppContext);
  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Text style={styles.titleBig}>WohApp!!</Text>
        <Text style={styles.subtitle}>Enter the world of mystery.</Text>
        <GradientBtn text="Find Dostti" onPress={loginAnonymously} />
        <Text style={styles.caption}>Secure • Anonymous • Private</Text>
      </View>
    </View>
  );
};

const LobbyScreen = ({ navigation }) => {
  const { coins, agents } = useContext(AppContext);

  const renderAgent = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} activeOpacity={0.9}
      onPress={() => navigation.navigate('Chat', { persona: item })}
    >
      <Image source={{ uri: item.image_url }} style={styles.cardImage} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.95)']} style={styles.cardOverlay}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardTag}>{item.tagline}</Text>
        <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{item.price_per_min} coins/min</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerBrand}>WohApp!!</Text>
        
        <TouchableOpacity onPress={() => navigation.navigate('Store')}>
          <View style={styles.coinPill}>
            <Coins size={14} color="#FFD700" />
            <Text style={styles.coinPillText}>{coins}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={agents}
        renderItem={renderAgent}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      />
      
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Store')}>
          <LinearGradient colors={THEME.gradientColors} style={styles.fabGradient}>
             <Users color="#fff" size={20} />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Store')}>
           <LinearGradient colors={THEME.gradientColors} style={styles.fabGradient}>
             <Play color="#fff" size={20} />
           </LinearGradient>
        </TouchableOpacity>
      </View>
      <LowBalanceNudge />
    </SafeAreaView>
  );
};

const ChatScreen = ({ route, navigation }) => {
  const { persona } = route.params;
  const { coins, deductCoins } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  useEffect(() => {
    setMessages([{ id: '0', text: `Hi, I'm ${persona.name}.`, sender: 'ai', type: 'text' }]);
    const timer = setInterval(() => { deductCoins(persona.price_per_min); }, 60000); 
    return () => clearInterval(timer);
  }, []);

  const sendMessage = async () => {
    if(!input.trim()) return;
    const userMsg = { id: Date.now().toString(), text: input, sender: 'user', type: 'text' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      let aiText = "I'm having trouble connecting.";

      if (OPENAI_API_KEY) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: persona.system_prompt || "You are a friendly companion." },
              ...messages.slice(-5).map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
              { role: "user", content: input }
            ]
          })
        });

        const data = await response.json();
        
        if (data.error) {
          console.error("OpenAI Error:", data.error);
          aiText = `Error: ${data.error.message}`;
        } else if (data.choices && data.choices[0]) {
          aiText = data.choices[0].message.content;
        }
      } 

      setMessages(prev => [...prev, { id: Date.now().toString(), text: aiText, sender: 'ai', type: 'text' }]);
      
      const isImage = Math.random() > 0.7; 
      if (isImage) {
        setTimeout(() => {
           const aiImgMsg = {
             id: (Date.now()+1).toString(), sender: 'ai', type: 'image',
             image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
             is_locked: true, cost: 15, text: 'Sent a photo'
           };
           setMessages(prev => [...prev, aiImgMsg]);
        }, 1000);
      }

    } catch (e) {
      console.error("Network Error:", e);
      Alert.alert("Network Error", "Check your internet connection.");
    } finally {
      setIsTyping(false);
    }
  };

  const unlockImage = (msgId, cost) => {
    if(deductCoins(cost)) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_locked: false } : m));
    }
  };

  const renderMsg = ({ item }) => {
    if (item.type === 'image') {
       return (
         <View style={[styles.msgBubble, styles.msgAi]}>
           {item.is_locked ? (
             <View style={styles.lockedImgBox}>
               <Image source={{ uri: item.image_url }} style={styles.lockedImg} blurRadius={15} />
               <View style={styles.lockOverlay}>
                 <Lock color="#fff" size={24} />
                 <Text style={{color:'#fff', marginBottom:5}}>Private Photo</Text>
                 <TouchableOpacity onPress={() => unlockImage(item.id, item.cost)}>
                   <LinearGradient colors={THEME.gradientColors} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.unlockBtn}>
                     <Text style={{color:'#fff', fontWeight:'bold'}}>Unlock {item.cost}c</Text>
                   </LinearGradient>
                 </TouchableOpacity>
               </View>
             </View>
           ) : (
             <Image source={{ uri: item.image_url }} style={styles.unlockedImg} />
           )}
         </View>
       );
    }
    return (
      <View style={[styles.msgBubble, item.sender === 'user' ? styles.msgUser : styles.msgAi]}>
        <Text style={item.sender === 'user' ? styles.msgTextUser : styles.msgTextAi}>{item.text}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft color="#fff" /></TouchableOpacity>
        <Image source={{ uri: persona.image_url }} style={styles.headerAvatar} />
        <View><Text style={styles.headerTitle}>{persona.name}</Text><Text style={styles.statusText}>15c/min</Text></View>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
        <FlatList data={messages} renderItem={renderMsg} contentContainerStyle={{padding:16}} />
        <View style={styles.inputArea}>
          <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Type..." placeholderTextColor="#666" />
          <TouchableOpacity onPress={sendMessage}>
             <LinearGradient colors={THEME.gradientColors} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.sendBtn}><Text style={{fontWeight:'bold'}}>Send</Text></LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <LowBalanceNudge />
    </SafeAreaView>
  );
};

const StoreScreen = ({ navigation }) => {
  const { addCoins } = useContext(AppContext);
  const [adsWatched, setAdsWatched] = useState(0);
  const [invitesUsed, setInvitesUsed] = useState(0);

  const handleInvite = async () => {
    await Share.share({ message: 'Join me on WohApp!!' });
    if (invitesUsed < 10) setInvitesUsed(prev => prev + 1);
  };

  const handleWatchAd = () => {
    if (adsWatched < 6) setAdsWatched(prev => prev + 1);
    addCoins(10);
  };

  const renderSlot = (index, current, keyPrefix) => {
    const isFilled = index < current;
    return (
      <View key={`${keyPrefix}-${index}`} style={[styles.slotCircle, isFilled && styles.slotFilled]}>
        {isFilled && <Coins size={12} color="#000" />}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Center</Text>
      </View>
      <FlatList
        ListHeaderComponent={() => (
          <>
            <View style={styles.activityBanner}>
               <Text style={styles.actTitle}>Invite Friends & Earn</Text>
               <View style={styles.slotRow}>{[...Array(10)].map((_, i) => renderSlot(i, invitesUsed, 'invite'))}</View>
               <GradientBtn text="Invite Friends" onPress={handleInvite} disabled={invitesUsed >= 10} style={{marginTop:10}} />
            </View>
            <View style={styles.activityBanner}>
               <Text style={styles.actTitle}>Watch Ads & Earn</Text>
               <View style={styles.slotRow}>{[...Array(6)].map((_, i) => renderSlot(i, adsWatched, 'ad'))}</View>
               <GradientBtn text="Watch Ad (+10c)" onPress={handleWatchAd} disabled={adsWatched >= 6} style={{marginTop:10}} />
            </View>
            <Text style={[styles.headerTitle, {marginTop:30, marginBottom:10}]}>Buy Coins</Text>
          </>
        )}
        data={COIN_PACKS} numColumns={2} keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => addCoins(item.amount)} style={styles.packGridItem}>
             <Text style={styles.packAmt}>{item.amount}</Text><Text style={{color:'#aaa', fontSize:12}}>Coins</Text>
             <LinearGradient colors={THEME.gradientColors} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.packPriceBtn}><Text style={{fontWeight:'bold'}}>{item.price}</Text></LinearGradient>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
};

const Stack = createStackNavigator();
export default function App() {
  return (
    <AppProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Lobby" component={LobbyScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Store" component={StoreScreen} presentation="modal" />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  logoBox: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', borderRadius: 20, marginBottom:40 },
  loadTrack: { width: '80%', height: 4, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden' },
  loadFill: { height: '100%', backgroundColor: '#D4AF37' },
  titleBig: { fontSize: 40, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 18, color: '#aaa', marginVertical: 20 },
  caption: { fontSize: 12, color: '#555', marginTop: 40 },
  gradientBtn: { paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
  headerBrand: { fontSize: 24, fontWeight: 'bold', color: '#fff' }, 
  coinPill: { backgroundColor: '#000', borderColor: '#D4AF37', borderWidth: 1, flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignItems: 'center', gap: 5 },
  coinPillText: { color: '#D4AF37', fontWeight: 'bold' },
  card: { height: 250, marginBottom: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#222' },
  cardImage: { width: '100%', height: '100%' },
  cardOverlay: { position: 'absolute', bottom: 0, width: '100%', padding: 16, paddingTop: 40 },
  cardTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  cardTag: { color: '#ddd' },
  priceBadge: { backgroundColor: '#000', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 5 },
  priceText: { color: '#D4AF37', fontSize: 12, fontWeight: 'bold' },
  fabContainer: { position: 'absolute', bottom: 20, right: 20, gap: 10 },
  fab: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden' },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginHorizontal: 10 },
  headerTitle: { color: '#fff', fontWeight: 'bold' },
  statusText: { color: '#aaa', fontSize: 12 },
  msgBubble: { padding: 12, borderRadius: 16, marginBottom: 10, maxWidth: '80%' },
  msgUser: { alignSelf: 'flex-end', backgroundColor: '#333' },
  msgAi: { alignSelf: 'flex-start', backgroundColor: '#000', borderWidth: 1, borderColor: '#333' },
  msgTextUser: { color: '#fff' },
  msgTextAi: { color: '#ddd' },
  inputArea: { flexDirection: 'row', padding: 10, backgroundColor: '#111', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#222', color: '#fff', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
  sendBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  activityBanner: { backgroundColor: '#000', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 16, marginBottom: 20 },
  actTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  slotRow: { flexDirection: 'row', gap: 5, marginBottom: 10, flexWrap:'wrap' },
  slotCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  slotFilled: { backgroundColor: '#D4AF37' },
  packGridItem: { flex: 1, margin: 5, backgroundColor: '#111', padding: 20, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  packAmt: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  packPriceBtn: { paddingHorizontal: 15, paddingVertical: 5, borderRadius: 15, marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  nudgeCard: { width: '85%', padding: 25, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#D4AF37' },
  closeBtn: { position: 'absolute', top: 10, right: 10 },
  nudgeTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  dealBox: { borderWidth: 1, borderColor: '#D4AF37', padding: 15, borderRadius: 10, marginBottom: 20, width: '100%', alignItems: 'center' },
  dealText: { color: '#D4AF37', textTransform: 'uppercase', fontSize: 10, fontWeight: 'bold' },
  dealPrice: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  lockedImgBox: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center' },
  lockedImg: { width: '100%', height: '100%', opacity: 0.3 },
  lockOverlay: { position: 'absolute', alignItems: 'center' },
  unlockedImg: { width: 200, height: 200, borderRadius: 10 },
  unlockBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginTop: 10 },
});