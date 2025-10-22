document.addEventListener("DOMContentLoaded", () => {
  // Google Apps Script URL (고객님 링크 유지)
  const API_URL = 'https://script.google.com/macros/s/AKfycbwfqm6JLNMXqL1MTumvEMuCp_IeBnddDMmIKocbQaMqOzXXayFz9DzdUWHnyt4LZEZ6AA/exec';

  const form = document.getElementById("petSurveyForm");
  const msg = document.getElementById("msg");
  const submissionsList = document.getElementById("submissionsList");
  const regionOtherInput = document.querySelector('input[name="regionOther"]');
  const tabBtns = document.querySelectorAll(".tab-btn");

  let localSubmissions = [];

  const keyMap = {
    hasPet: "반려동물 보유",
    region: "지역",
    regionOther: "직접 입력 지역",
    priorityCriteria: "병원 선택 기준",
    concernAndFeature: "불만/필요 기능",
    priority1: "1순위 정보",
    priority2: "2순위 정보",
    priceRange: "최대 지불 의향"
  };

  /**
   * 1. 서버에서 최신 데이터를 가져와 localSubmissions를 갱신하고, 화면을 다시 그리는 핵심 함수
   */
  const fetchSubmissions = async () => {
    try {
      const uniqueApiUrl = `${API_URL}?t=${new Date().getTime()}`;
      submissionsList.innerHTML = '<div class="placeholder">제출된 기록을 불러오는 중입니다...</div>';

      const res = await fetch(uniqueApiUrl);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();

      if (Array.isArray(data)) {
        localSubmissions = data;
        renderSubmissions(); // 목록 갱신
      } else {
        submissionsList.innerHTML = '<div class="placeholder">데이터 로딩 실패: 서버 응답 형식이 올바르지 않습니다.</div>';
      }
    } catch (error) {
      console.error("서버 데이터 로딩 오류:", error);
      submissionsList.innerHTML = '<div class="placeholder">네트워크 오류 또는 서버 오류로 데이터를 불러올 수 없습니다.</div>';
    }
  };


  // 2. 폼 제출 (POST 후, 전체 데이터 재요청 로직 포함)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "✅ 제출 중...";

    const data = new FormData(form);
    const payload = {};
    for (const [k, v] of data.entries()) payload[k] = v;

    try {
      // mode: 'no-cors'는 실제 요청 성공 여부를 확인할 수 없으므로,
      // 데이터는 전송되었을 것으로 가정하고 바로 다음 작업을 진행합니다.
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      msg.textContent = "💌 제출이 완료되었습니다! 의견 목록을 갱신합니다.";

      await fetchSubmissions();

      form.reset();
      regionOtherInput.style.display = "none";
      
      // '다른 사람 의견 보기' 탭으로 자동 전환 및 활성화
      document.querySelector('.tab-btn[data-target="submissions"]').click();

    } catch (error) {
      // no-cors 모드에서는 오류가 나더라도 서버에 전송되었을 가능성이 높습니다.
      msg.textContent = "⚠️ 서버 응답 오류 발생. 데이터 갱신을 시도합니다.";
      await fetchSubmissions();
      document.querySelector('.tab-btn[data-target="submissions"]').click();
    }
  });

  // 3. submissions 렌더링
  const renderSubmissions = () => {
    submissionsList.innerHTML = "";
    
    if (localSubmissions.length === 0) {
      submissionsList.innerHTML = '<div class="placeholder">아직 제출된 기록이 없습니다.</div>';
      return;
    }
    
    localSubmissions.slice().reverse().forEach((sub) => {
      const card = document.createElement("div");
      card.className = "record";
      let html = Object.entries(sub)
        // regionOther 필터링 및 빈 값 제거
        .filter(([k,v]) => !(k === "regionOther" && sub.region !== "기타") && v !== "")
        // keyMap에 없는 이상한 키 필터링 (Reaction 등)
        .filter(([k, v]) => keyMap[k] !== undefined)
        .map(([k,v]) => `<div><strong>${keyMap[k]||k}:</strong> ${v}</div>`)
        .join("");
      
      if (!html) html = "<div>제출된 정보 없음</div>";
      card.innerHTML = html;
      submissionsList.appendChild(card);
    });
  };

  // 5. 탭 클릭 이벤트 (탭 전환 및 submissions 탭 클릭 시 서버 데이터 재요청)
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.add("active");

      if (btn.dataset.target === "submissions") {
        fetchSubmissions(); // 탭 클릭 시에도 최신 데이터 강제 로드
      }
    });
  });

  // 6. 초기 서버 데이터 로드
  fetchSubmissions();

  // 7. "기타" 입력 토글
  document.querySelectorAll('input[name="region"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === "기타") {
        regionOtherInput.style.display = "block";
        regionOtherInput.required = true;
      } else {
        regionOtherInput.style.display = "none";
        regionOtherInput.required = false;
      }
    });
  });
});
