import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Coins, MessageCircle, Phone, User } from 'lucide-react-native';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Image,
    StyleSheet, Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// --- CONFIGURATION & MOCK DATA ---
const THEME = {
  background: '#121212',
  surface: '#1E1E1E',
  primary: '#D4AF37', // Gold for premium feel
  text: '#E0E0E0',
  textSecondary: '#A0A0A0',
  danger: '#CF6679',
  success: '#03DAC6',
};

const PERSONAS = [
  { 
    id: '1', 
    name: 'Sophia', 
    tagline: 'Loves deep conversations', 
    desc: 'I am here to listen. Tell me what is on your mind.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    priceChat: 2, // coins per message
    priceCall: 80 // coins per minute
  },
  { 
    id: '2', 
    name: 'Ananya', 
    tagline: 'Sweet, warm & flirty', 
    desc: 'Let’s keep things light and fun. How was your day?',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    priceChat: 3, 
    priceCall: 90
  },
  { 
    id: '3', 
    name: 'Elena', 
    tagline: 'Calm & Comforting', 
    desc: 'A safe space for you to relax and unwind.',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
    priceChat: 2, 
    priceCall: 75
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
  const [coins, setCoins] = useState(0); // Starts at 0, gets 30 in onboarding
  const [user, setUser] = useState({ name: 'Guest', id: null });

  const addCoins = (amount) => setCoins(prev => prev + amount);
  const deductCoins = (amount) => {
    if (coins >= amount) {
      setCoins(prev => prev - amount);
      return true;
    }
    return false;
  };

  return (
    <AppContext.Provider value={{ coins, user, setUser, addCoins, deductCoins }}>
      {children}
    </AppContext.Provider>
  );
};

// --- COMPONENTS ---

// 1. Onboarding Screen
const OnboardingScreen = ({ navigation }) => {
  const { addCoins } = useContext(AppContext);
  const [step, setStep] = useState(1);

  const handleLogin = () => {
    // Simulate API Login
    setTimeout(() => {
      setStep(2);
      // Give Free Coins
      setTimeout(() => {
        addCoins(30);
        Alert.alert("Welcome Gift!", "You received 30 free coins to start.");
        navigation.replace('Lobby');
      }, 1500);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContent}>
        {step === 1 ? (
          <>
            <Text style={styles.titleBig}>Solace</Text>
            <Text style={styles.subtitle}>Find warmth, comfort, and someone to talk to.</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin}>
              <Text style={styles.btnText}>Start My Journey</Text>
            </TouchableOpacity>
            <Text style={styles.caption}>Secure & Anonymous</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={[styles.subtitle, { marginTop: 20 }]}>Creating your safe space...</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

// 2. Lobby Screen
const LobbyScreen = ({ navigation }) => {
  const { coins } = useContext(AppContext);

  const renderPersona = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('Chat', { persona: item })}
    >
      <Image source={{ uri: item.image }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardTag}>{item.tagline}</Text>
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Chat', { persona: item })}
          >
            <MessageCircle size={16} color={THEME.background} />
            <Text style={styles.actionBtnText}>Chat ({item.priceChat}c)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#333', borderWidth: 1, borderColor: THEME.primary }]}
            onPress={() => navigation.navigate('Call', { persona: item })}
          >
            <Phone size={16} color={THEME.primary} />
            <Text style={[styles.actionBtnText, { color: THEME.primary }]}>Call ({item.priceCall}c/m)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <User size={24} color={THEME.text} />
          <Text style={styles.headerTitle}>  Available Companions</Text>
        </View>
        <TouchableOpacity style={styles.coinBadge} onPress={() => navigation.navigate('Store')}>
          <Coins size={16} color={THEME.background} />
          <Text style={styles.coinText}>{coins}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={PERSONAS}
        renderItem={renderPersona}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
};

// 3. Chat Screen
const ChatScreen = ({ route, navigation }) => {
  const { persona } = route.params;
  const { coins, deductCoins } = useContext(AppContext);
  const [messages, setMessages] = useState([
    { id: '0', text: `Hi there! I'm ${persona.name}. ${persona.desc}`, sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef();

  const sendMessage = () => {
    if (!input.trim()) return;

    // Check Balance
    if (coins < persona.priceChat) {
      Alert.alert("Low Balance", "Please top up to continue chatting.", [
        { text: "Cancel" },
        { text: "Go to Store", onPress: () => navigation.navigate('Store') }
      ]);
      return;
    }

    // Deduct
    deductCoins(persona.priceChat);

    const userMsg = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI Response
    setTimeout(() => {
      const responses = [
        "That sounds interesting, tell me more.",
        "I've missed talking to you.",
        "You are so charming today!",
        "I understand completely. How does that make you feel?",
        "Sending you a warm hug through the screen 💛"
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const aiMsg = { id: (Date.now() + 1).toString(), text: randomResponse, sender: 'ai' };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 2000); // 2 second delay for realism
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
          <Text style={styles.statusText}>Online</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerCallBtn}
          onPress={() => navigation.navigate('Call', { persona })}
        >
          <Phone size={20} color={THEME.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        onContentSizeChange={() => flatListRef.current.scrollToEnd()}
        renderItem={({ item }) => (
          <View style={[
            styles.msgBubble, 
            item.sender === 'user' ? styles.msgUser : styles.msgAi
          ]}>
            <Text style={item.sender === 'user' ? styles.msgTextUser : styles.msgTextAi}>
              {item.text}
            </Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16 }}
      />

      {isTyping && <Text style={styles.typingIndicator}>{persona.name} is typing...</Text>}

      <View style={styles.inputArea}>
        <TextInput 
          style={styles.input} 
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor="#666"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// 4. Call Screen
const CallScreen = ({ route, navigation }) => {
  const { persona } = route.params;
  const { coins, deductCoins } = useContext(AppContext);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState('Connecting...');
  
  // Animation for "waveform"
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();

    // Connection logic
    const connectTimer = setTimeout(() => {
      setStatus('Connected');
      
      // Billing Interval
      const interval = setInterval(() => {
        setDuration(prev => prev + 1);
        
        // Deduct every 60 seconds (simplified: deduct immediately for demo logic)
        // In real app: check timer % 60 === 0
        const success = deductCoins(persona.priceCall / 60); // Simplified burn rate
        if (!success && coins < 5) { // Threshold
           clearInterval(interval);
           Alert.alert("Call Ended", "You ran out of coins.", [
             { text: "OK", onPress: () => navigation.goBack() }
           ]);
        }
      }, 1000);

      return () => clearInterval(interval);
    }, 2000);

    return () => clearTimeout(connectTimer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <Image source={{ uri: persona.image }} style={styles.callImage} blurRadius={5} />
      <View style={styles.overlay} />
      
      <View style={styles.callContent}>
        <Animated.Image 
          source={{ uri: persona.image }} 
          style={[styles.callAvatar, { transform: [{ scale: pulseAnim }] }]} 
        />
        <Text style={styles.callName}>{persona.name}</Text>
        <Text style={styles.callStatus}>{status}</Text>
        {status === 'Connected' && <Text style={styles.callTimer}>{formatTime(duration)}</Text>}
      </View>

      <View style={styles.callActions}>
        <TouchableOpacity style={styles.hangupBtn} onPress={() => navigation.goBack()}>
          <Phone size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// 5. Store Screen
const StoreScreen = ({ navigation }) => {
  const { coins, addCoins } = useContext(AppContext);

  const buyPack = (pack) => {
    Alert.alert("Confirm Purchase", `Buy ${pack.amount} coins for ${pack.price}?`, [
      { text: "Cancel" },
      { text: "Buy", onPress: () => {
        addCoins(pack.amount);
        Alert.alert("Success", "Coins added!");
        navigation.goBack();
      }}
    ]);
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
            <View>
              <Text style={styles.packAmount}>{item.amount} Coins</Text>
              {item.tag ? <Text style={styles.packTag}>{item.tag}</Text> : null}
            </View>
            <View style={styles.priceBtn}>
              <Text style={styles.priceText}>{item.price}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
};

// --- NAVIGATION ---
const Stack = createStackNavigator();

export default function App() {
  return (
    <AppProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Lobby" component={LobbyScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Call" component={CallScreen} />
            <Stack.Screen name="Store" component={StoreScreen} presentation="modal" />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AppProvider>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  titleBig: {
    fontSize: 40,
    fontWeight: 'bold',
    color: THEME.primary,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
  },
  caption: {
    fontSize: 14,
    color: '#555',
    marginTop: 20,
  },
  btnPrimary: {
    backgroundColor: THEME.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },
  // Lobby
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
  },
  coinBadge: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  coinText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.text,
  },
  cardTag: {
    fontSize: 16,
    color: THEME.primary,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Chat
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 16,
  },
  statusText: {
    color: THEME.success,
    fontSize: 12,
  },
  msgBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    maxWidth: '80%',
  },
  msgUser: {
    backgroundColor: THEME.primary,
    alignSelf: 'flex-end',
  },
  msgAi: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
  },
  msgTextUser: {
    color: '#000',
    fontSize: 16,
  },
  msgTextAi: {
    color: '#fff',
    fontSize: 16,
  },
  inputArea: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  input: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  sendBtnText: {
    color: '#000',
    fontWeight: 'bold',
  },
  typingIndicator: {
    marginLeft: 16,
    marginBottom: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  headerCallBtn: {
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 20,
  },
  // Call
  callImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  callContent: {
    alignItems: 'center',
  },
  callAvatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: THEME.primary,
    marginBottom: 20,
  },
  callName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  callStatus: {
    fontSize: 18,
    color: '#ccc',
    marginTop: 10,
  },
  callTimer: {
    fontSize: 24,
    color: '#fff',
    marginTop: 20,
    fontVariant: ['tabular-nums'],
  },
  hangupBtn: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: THEME.danger,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Store
  balanceContainer: {
    backgroundColor: '#333',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  balanceValue: {
    color: THEME.primary,
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  packCard: {
    backgroundColor: THEME.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  packTag: {
    color: THEME.success,
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
  priceBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  priceText: {
    fontWeight: 'bold',
    color: '#000',
  }
});