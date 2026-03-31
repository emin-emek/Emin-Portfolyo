const cups = [
    document.getElementById('cup-0'),
    document.getElementById('cup-1'),
    document.getElementById('cup-2')
];
const ball = document.getElementById('ball');
const startBtn = document.getElementById('start-btn');
const messageEl = document.getElementById('message');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');

// Analytics DOM elements
const winRateEl = document.getElementById('win-rate');
const probabilityEl = document.getElementById('probability-stat');

// Analytics Data
let totalGames = 0;
let totalWins = 0;
let chartLabels = [];
let chartData = [];
let speedChart;

// Standart pozisyonlar (piksel cinsinden soldan uzaklık)
const positions = [50, 250, 450];
let cupPositions = [0, 1, 2]; // Hangi bardağın hangi pozisyonda olduğunu takip eder

let ballPosition = 1;
let ballUnderCup = 1;

let isPlaying = false;
let isShuffling = false;
let score = 0;
let level = 1;

let shuffleSpeed = 500; // milisaniye cinsinden hız
let shuffleCountBase = 5;

// Chart.js Kurulumu
function initChart() {
    const ctx = document.getElementById('speedChart').getContext('2d');
    
    // Gradient for chart line
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 124, 255, 0.5)'); // Tok mavi gradient (üst)
    gradient.addColorStop(1, 'rgba(0, 124, 255, 0.0)'); // Tok mavi gradient (alt)
    
    speedChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Tepki Hızı (ms)',
                data: chartData,
                borderColor: '#007cff', // Tok mavi çizgi
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#007cff', // Tok mavi noktalar
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#b0bec5' } }
            },
            scales: {
                x: { ticks: { color: '#78909c' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                y: { 
                    ticks: { color: '#78909c' }, 
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    min: 0,
                    max: 600
                }
            }
        }
    });
}

function updateAnalytics() {
    // Win Rate
    let winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    winRateEl.textContent = `${winRate}%`;

    // Probability Logic: Base is 33.3%, but gets dynamically modified based on games played (mock logic for flavor)
    let currentProb = 33.3;
    if (totalGames > 0) {
        // If they win a lot, the perceived "probability" drops as game gets harder/faster
        currentProb = (33.3 * (1 - (level * 0.05))).toFixed(1);
        if (currentProb < 10) currentProb = 10;
        probabilityEl.textContent = `${currentProb}%`;
    } else {
        probabilityEl.textContent = `33.3%`;
    }

    // Chart update
    chartLabels.push(`Oyun ${totalGames}`);
    chartData.push(shuffleSpeed);
    
    // Keep chart clean, max 10 points
    if (chartLabels.length > 10) {
        chartLabels.shift();
        chartData.shift();
    }
    
    speedChart.update();
}

// Oyunu başlangıç durumuna getir
function initCups() {
    cups.forEach((cup, idx) => {
        cup.style.left = `${positions[idx]}px`;
        cup.style.transitionDuration = `${shuffleSpeed}ms`;
        cup.dataset.cupId = idx;
    });
    ballUnderCup = 1;
    ballPosition = 1;
    setPosition(ball, ballPosition);
}

// Elemanın pozisyonunu ayarla
function setPosition(element, posIndex) {
    if (element === ball) {
        element.style.left = `${positions[posIndex] + 35}px`; // Bardağın ortasına (100px bardak - 30px top) / 2 = 35px
    } else {
        element.style.left = `${positions[posIndex]}px`;
    }
}

// CSS animasyon hızını güncelle
function updateSpeed() {
    cups.forEach(cup => {
        cup.style.transitionDuration = `${shuffleSpeed}ms`;
    });
    ball.style.transitionDuration = `${shuffleSpeed}ms`;
}

// Uyuma fonksiyonu (bekleme)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function startGame() {
    if (isPlaying || isShuffling) return;
    
    // Her start dendiğinde topları aşağıda tutmaya ve renkleri sıfırlamaya emin ol
    cups.forEach(c => {
        c.classList.remove('lifted', 'correct', 'wrong');
    });
    ball.style.opacity = '0';
    await sleep(200);

    isPlaying = true;
    startBtn.disabled = true;
    messageEl.textContent = "Dikkatli izle!";
    messageEl.className = "message";

    // Topu rastgele bir bardağın altına yerleştir
    ballUnderCup = Math.floor(Math.random() * 3);
    ballPosition = cupPositions[ballUnderCup];
    
    // Topu yerine ışınlarken geçiş (transition) animasyonunu kapat
    ball.style.transition = 'none';
    setPosition(ball, ballPosition);
    
    // Tarayıcı pozisyonu işledikten sonra görünür yapıp transition'u geri ver
    setTimeout(() => {
        ball.style.transition = `left ${shuffleSpeed}ms ease-in-out`;
        ball.style.opacity = '1';
    }, 20);
    
    // Bardağı kaldırıp topu göster (Bardağı yeşil yak)
    cups[ballUnderCup].classList.add('lifted', 'correct');
    await sleep(1500);
    
    // Bardağı kapat ve rengi normale döndür
    cups[ballUnderCup].classList.remove('lifted', 'correct');
    await sleep(shuffleSpeed + 100);
    
    // Animasyonda top görünmesin diye tamamen gizle (göz yanılgısını önlemek için)
    ball.style.opacity = '0';
    setTimeout(() => { ball.style.display = 'none'; }, 200);
    
    // Karıştırmaya başla
    isShuffling = true;
    let shuffles = shuffleCountBase + Math.floor((level - 1) / 2); // Seviye arttıkça karıştırma sayısı da biraz artar
    
    for (let i = 0; i < shuffles; i++) {
        await doShuffle();
    }
    
    isShuffling = false;
    
    // Karıştırma bittiğinde topu direkt doğru bardağın altına ışınla
    ballPosition = cupPositions[ballUnderCup];
    ball.style.transition = 'none'; // Işınlanma sırasında süzülmeyi engelle
    setPosition(ball, ballPosition);
    ball.style.display = 'block';
    
    setTimeout(() => {
        ball.style.transition = `left ${shuffleSpeed}ms ease-in-out`;
    }, 20);
    
    messageEl.textContent = "Hangi bardakta?";
}

async function doShuffle() {
    // Rastgele iki farklı pozisyon seç
    let p1 = Math.floor(Math.random() * 3);
    let p2 = Math.floor(Math.random() * 3);
    while (p1 === p2) p2 = Math.floor(Math.random() * 3);
    
    // Kavisleri daha takip edilebilir yapmak için: 
    // Her zaman soldaki kupa ÖNDEN (arcFront), sağdaki kupa ARKADAN (arcBack) geçsin.
    let pos1 = Math.min(p1, p2); // Sol pozisyon
    let pos2 = Math.max(p1, p2); // Sağ pozisyon
    
    let cup1Index = cupPositions.indexOf(pos1);
    let cup2Index = cupPositions.indexOf(pos2);
    
    // Pozisyonları takas et
    cupPositions[cup1Index] = pos2;
    cupPositions[cup2Index] = pos1;
    
    // Pürüzsüz kavis animasyonu ile kimin önden kimin arkadan geçeceğini ayarla
    cups[cup1Index].style.zIndex = 20;
    cups[cup2Index].style.zIndex = 5;
    
    // CSS Keyframes animasyonunu oynat (kavis süresi left transition ile aynı olacak)
    cups[cup1Index].style.animation = `arcFront ${shuffleSpeed}ms ease-in-out`;
    cups[cup2Index].style.animation = `arcBack ${shuffleSpeed}ms ease-in-out`;
    
    // Yatay eksende yeni pozisyonlara hareket ettir (left CSS transition)
    setPosition(cups[cup1Index], pos2);
    setPosition(cups[cup2Index], pos1);
    
    // Tam hareket süresi kadar bekle
    await sleep(shuffleSpeed); 
    
    // Animasyonları ve derinliği sıfırla
    cups[cup1Index].style.animation = "none";
    cups[cup2Index].style.animation = "none";
    cups[cup1Index].style.zIndex = 10;
    cups[cup2Index].style.zIndex = 10;
    
    // Çok yüksek hızlarda keyframe tetikleyicilerinin çakışmaması için minik bir bekleme
    await sleep(20);
}

cups.forEach((cup) => {
    cup.addEventListener('click', async () => {
        if (!isPlaying || isShuffling) return; 
        let clickedCupId = parseInt(cup.dataset.cupId);
        
        isPlaying = false; // Başka tıklama alınmasını engelle
        
        ball.style.opacity = '1';
        cup.classList.add('lifted');
        
        await sleep(600);
        
        totalGames++;

        if (clickedCupId === ballUnderCup) {
            // Kazandı
            cup.classList.add('correct');
            totalWins++;
            score += 10;
            level++;
            scoreEl.textContent = score;
            levelEl.textContent = level;
            
            // Hızlan! Süreyi %15 azalt
            shuffleSpeed = Math.max(150, shuffleSpeed * 0.85);
            updateSpeed();
            
            messageEl.textContent = "Tebrikler! Doğru bildin.";
            messageEl.className = "message success";
        } else {
            // Kaybetti
            cup.classList.add('wrong');
            cups[ballUnderCup].classList.add('lifted', 'correct'); // Topun asıl yerini göster
            score = 0;
            level = 1;
            shuffleSpeed = 500; // Hızı sıfırla
            updateSpeed();
            scoreEl.textContent = score;
            levelEl.textContent = level;
            
            messageEl.textContent = "Yanlış! Baştan başlıyoruz.";
            messageEl.className = "message error";
        }
        
        updateAnalytics();
        
        startBtn.textContent = "Tekrar Oyna";
        startBtn.disabled = false;
    });
});

startBtn.addEventListener('click', startGame);

// Oyunu hazırla ve grafiği yükle
initChart();
initCups();
