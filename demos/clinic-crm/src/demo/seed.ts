import { addDays, format, getISODay, parseISO } from "date-fns";
import { DEMO_ACCOUNTS } from "./accounts";

const WEEK_SHIFTS = [
  { weekday: 1, startMin: 540, endMin: 1080, lunchStartMin: 780, lunchEndMin: 840 },
  { weekday: 2, startMin: 540, endMin: 1080, lunchStartMin: 780, lunchEndMin: 840 },
  { weekday: 3, startMin: 540, endMin: 1080, lunchStartMin: 780, lunchEndMin: 840 },
  { weekday: 4, startMin: 540, endMin: 1080, lunchStartMin: 780, lunchEndMin: 840 },
  { weekday: 5, startMin: 540, endMin: 1005, lunchStartMin: 780, lunchEndMin: 840 },
];

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function today() {
  return format(new Date(), "yyyy-MM-dd");
}

export function nearestOpenDay(from = new Date()) {
  let d = from;
  for (let i = 0; i < 7; i += 1) {
    const iso = getISODay(d);
    if (iso <= 5) return format(d, "yyyy-MM-dd");
    d = addDays(d, 1);
  }
  return format(from, "yyyy-MM-dd");
}

export type DemoDb = ReturnType<typeof createSeedDb>;

export function createSeedDb() {
  const day = nearestOpenDay();
  const userId = id("user");

  const specialties = [
    { id: id("spec"), name: "Неврология", isActive: true },
    { id: id("spec"), name: "АФК", isActive: true },
    { id: id("spec"), name: "Логопедия", isActive: true },
    { id: id("spec"), name: "Массаж", isActive: true },
    { id: id("spec"), name: "Психология", isActive: true },
  ];

  const rooms = [
    { id: id("room"), name: "Кабинет 1", capacity: 1, isActive: true },
    { id: id("room"), name: "Кабинет 2", capacity: 1, isActive: true },
    { id: id("room"), name: "Кабинет 3", capacity: 1, isActive: true },
    { id: id("room"), name: "Кабинет 4", capacity: 1, isActive: true },
    { id: id("room"), name: "Зал АФК", capacity: 2, isActive: true },
    { id: id("room"), name: "Галокамера", capacity: 4, isActive: true },
    { id: id("room"), name: "Массажный 1", capacity: 1, isActive: true },
    { id: id("room"), name: "Массажный 2", capacity: 1, isActive: true },
  ];

  const services = [
    { id: id("svc"), name: "Практическое АФК", durationMin: 30, color: "#52944d", isGroup: false, isActive: true },
    { id: id("svc"), name: "Массаж", durationMin: 30, color: "#c47a2c", isGroup: false, isActive: true },
    { id: id("svc"), name: "Логопед", durationMin: 30, color: "#0d7edf", isGroup: false, isActive: true },
    { id: id("svc"), name: "Галокамера", durationMin: 30, color: "#2a9d8f", isGroup: true, isActive: true },
    { id: id("svc"), name: "Детензор", durationMin: 45, color: "#7c5cbf", isGroup: false, isActive: true },
    { id: id("svc"), name: "Психолог", durationMin: 30, color: "#c45c8a", isGroup: false, isActive: true },
    { id: id("svc"), name: "Диагностика", durationMin: 30, color: "#5f6f58", isGroup: false, isActive: true },
  ];

  const [specNeuro, specAfk, specLogo, specMassage, specPsycho] = specialties;
  const [room1, room2, room3, room4, roomAfk, _roomHalo, roomMass1, roomMass2] = rooms;
  const [svcAfk, svcMassage, svcLogo, svcHalo, svcDetenzor, svcPsycho] = services;

  const employeeDefs = [
    { fullName: "Ковалева Анастасия Олеговна", shortName: "Ковалева А.", position: "невролог", color: "#52944d", specialtyId: specNeuro.id, defaultRoomId: room1.id },
    { fullName: "Федулова Мария Ивановна", shortName: "Федулова М.", position: "АФК", color: "#2a9d8f", specialtyId: specAfk.id, defaultRoomId: roomAfk.id },
    { fullName: "Петрова Ольга Сергеевна", shortName: "Петрова О.", position: "логопед", color: "#7c5cbf", specialtyId: specLogo.id, defaultRoomId: room2.id },
    { fullName: "Смирнова Ирина Викторовна", shortName: "Смирнова И.", position: "массажист", color: "#c47a2c", specialtyId: specMassage.id, defaultRoomId: roomMass1.id },
    { fullName: "Волкова Екатерина Павловна", shortName: "Волкова Е.", position: "психолог", color: "#c45c8a", specialtyId: specPsycho.id, defaultRoomId: room3.id },
    { fullName: "Орлова Дарья Андреевна", shortName: "Орлова Д.", position: "АФК", color: "#3d8b6e", specialtyId: specAfk.id, defaultRoomId: roomAfk.id },
    { fullName: "Никитина Анна Сергеевна", shortName: "Никитина А.", position: "логопед", color: "#4a6fd0", specialtyId: specLogo.id, defaultRoomId: room4.id },
    { fullName: "Белова Татьяна Игоревна", shortName: "Белова Т.", position: "массажист", color: "#b5651d", specialtyId: specMassage.id, defaultRoomId: roomMass2.id },
  ];

  const employees = employeeDefs.map((e) => {
    const empId = id("emp");
    return {
      id: empId,
      fullName: e.fullName,
      shortName: e.shortName,
      position: e.position,
      specialtyId: e.specialtyId as string | null,
      specialty: specialties.find((s) => s.id === e.specialtyId) ?? null,
      color: e.color,
      isActive: true,
      showInCalendar: true,
      defaultRoomId: e.defaultRoomId as string | null,
      defaultRoom: rooms.find((r) => r.id === e.defaultRoomId) ?? null,
      workShifts: WEEK_SHIFTS.map((s) => ({ ...s, id: id("shift") })),
    };
  });

  const [empNeuro, empAfk1, empLogo1, empMass1, empPsycho, empAfk2, empLogo2, empMass2] = employees;

  const groupId = id("grp");
  // Возраст на демо-день: Яшины ~9–10 → AGE_8_11; Алёхин ~6 → AGE_4_7; Соколова ~12 → AGE_12_15
  const clients = [
    {
      id: id("cli"),
      fullName: "Яшина Татьяна",
      phone: "+7 916 111-22-35",
      note: null as string | null,
      birthDate: "2016-11-20",
      ageCategory: "CHILD" as const,
      categories: ["OVZ"],
      groupId,
      isPrimary: true,
      isActive: true,
    },
    {
      id: id("cli"),
      fullName: "Яшин Кирилл",
      phone: "+7 916 111-22-36",
      note: "Брат Татьяны",
      birthDate: "2015-08-14",
      ageCategory: "CHILD" as const,
      categories: ["OVZ"],
      groupId,
      isPrimary: false,
      isActive: true,
    },
    {
      id: id("cli"),
      fullName: "Алёхин Артём",
      phone: "+7 903 222-33-44",
      note: null,
      birthDate: "2020-06-03",
      ageCategory: "CHILD" as const,
      categories: ["CHILD_DISABILITY", "OVZ"],
      groupId: null as string | null,
      isPrimary: true,
      isActive: true,
    },
    {
      id: id("cli"),
      fullName: "Соколова Мария",
      phone: "+7 926 555-66-77",
      note: null,
      birthDate: "2014-03-18",
      ageCategory: "CHILD" as const,
      categories: [] as string[],
      groupId: null,
      isPrimary: true,
      isActive: true,
    },
    {
      id: id("cli"),
      fullName: "Иванов Пётр",
      phone: "+7 999 100-20-30",
      note: "Взрослый курс",
      birthDate: "1985-07-09",
      ageCategory: "ADULT" as const,
      categories: [],
      groupId: null,
      isPrimary: true,
      isActive: true,
    },
    {
      id: id("cli"),
      fullName: "Кузнецова Анна",
      phone: "+7 903 444-55-66",
      note: null,
      birthDate: "1992-01-22",
      ageCategory: "ADULT" as const,
      categories: [],
      groupId: null,
      isPrimary: true,
      isActive: true,
    },
    {
      id: id("cli"),
      fullName: "Морозов Егор",
      phone: "+7 926 700-11-22",
      note: null,
      birthDate: "2017-05-12",
      ageCategory: "CHILD" as const,
      categories: ["OVZ"],
      groupId: null,
      isPrimary: true,
      isActive: true,
    },
    {
      id: id("cli"),
      fullName: "Лебедева Ольга",
      phone: "+7 915 333-44-55",
      note: null,
      birthDate: "1988-09-01",
      ageCategory: "ADULT" as const,
      categories: [],
      groupId: null,
      isPrimary: true,
      isActive: true,
    },
    {
      id: id("cli"),
      fullName: "Новиков Максим",
      phone: "+7 977 888-99-00",
      note: null,
      birthDate: "2019-02-27",
      ageCategory: "CHILD" as const,
      categories: ["OJD"],
      groupId: null,
      isPrimary: true,
      isActive: true,
    },
    {
      id: id("cli"),
      fullName: "Фролова Дарья",
      phone: "+7 964 121-31-41",
      note: null,
      birthDate: "2013-12-05",
      ageCategory: "CHILD" as const,
      categories: [],
      groupId: null,
      isPrimary: true,
      isActive: true,
    },
  ];

  const [cliYashina, cliYashin, cliAlekhin, cliSokolova, cliIvanov, cliKuznetsova, cliMorozov, cliLebedeva, cliNovikov, cliFrolova] =
    clients;

  const clientGroups = [
    { id: groupId, name: "Семья Яшиных", _count: { clients: 2 } },
  ];

  type Apt = {
    id: string;
    date: string;
    startMin: number;
    endMin: number;
    status: "PLANNED" | "DONE" | "CANCELLED";
    clientNoShow: boolean;
    note: string;
    groupSessionId: string | null;
    groupAgeRange: string | null;
    coStaffSessionId: string | null;
    diagnosticPeriodId: string | null;
    clientId: string;
    employeeId: string;
    serviceId: string;
    roomId: string | null;
  };

  const apt = (
    partial: Omit<Apt, "id" | "status" | "clientNoShow" | "note" | "groupSessionId" | "groupAgeRange" | "coStaffSessionId" | "diagnosticPeriodId"> &
      Partial<Pick<Apt, "note" | "groupSessionId" | "groupAgeRange" | "coStaffSessionId" | "diagnosticPeriodId" | "status">>,
  ): Apt => ({
    id: id("apt"),
    status: "PLANNED",
    clientNoShow: false,
    note: "",
    groupSessionId: null,
    groupAgeRange: null,
    coStaffSessionId: null,
    diagnosticPeriodId: null,
    ...partial,
  });

  // Ближайшие 5 рабочих дней от якоря (неделя вперёд без выходных).
  const weekDays: string[] = [];
  {
    let cursor = parseISO(`${day}T12:00:00`);
    for (let i = 0; i < 10 && weekDays.length < 5; i += 1) {
      if (getISODay(cursor) <= 5) weekDays.push(format(cursor, "yyyy-MM-dd"));
      cursor = addDays(cursor, 1);
    }
  }

  const clientPool = [
    cliYashina,
    cliYashin,
    cliAlekhin,
    cliSokolova,
    cliIvanov,
    cliKuznetsova,
    cliMorozov,
    cliLebedeva,
    cliNovikov,
    cliFrolova,
  ];

  type SlotPlan = {
    startMin: number;
    endMin: number;
    employeeId: string;
    serviceId: string;
    roomId: string | null;
    clientOffset: number;
  };

  // Плотная сетка на день: у каждого специалиста по несколько слотов.
  const dayPlan: SlotPlan[] = [
    { startMin: 540, endMin: 570, employeeId: empLogo1.id, serviceId: svcLogo.id, roomId: room2.id, clientOffset: 0 },
    { startMin: 540, endMin: 570, employeeId: empAfk1.id, serviceId: svcAfk.id, roomId: roomAfk.id, clientOffset: 2 },
    { startMin: 540, endMin: 570, employeeId: empMass1.id, serviceId: svcMassage.id, roomId: roomMass1.id, clientOffset: 4 },
    { startMin: 570, endMin: 600, employeeId: empLogo2.id, serviceId: svcLogo.id, roomId: room4.id, clientOffset: 6 },
    { startMin: 570, endMin: 600, employeeId: empAfk2.id, serviceId: svcAfk.id, roomId: roomAfk.id, clientOffset: 8 },
    { startMin: 570, endMin: 600, employeeId: empPsycho.id, serviceId: svcPsycho.id, roomId: room3.id, clientOffset: 5 },
    { startMin: 600, endMin: 630, employeeId: empLogo1.id, serviceId: svcLogo.id, roomId: room2.id, clientOffset: 1 },
    { startMin: 600, endMin: 630, employeeId: empMass2.id, serviceId: svcMassage.id, roomId: roomMass2.id, clientOffset: 3 },
    { startMin: 600, endMin: 630, employeeId: empNeuro.id, serviceId: svcDetenzor.id, roomId: room1.id, clientOffset: 4 },
    { startMin: 630, endMin: 660, employeeId: empAfk1.id, serviceId: svcAfk.id, roomId: roomAfk.id, clientOffset: 7 },
    { startMin: 630, endMin: 660, employeeId: empAfk2.id, serviceId: svcAfk.id, roomId: roomAfk.id, clientOffset: 9 },
    { startMin: 660, endMin: 690, employeeId: empMass1.id, serviceId: svcMassage.id, roomId: roomMass1.id, clientOffset: 0 },
    { startMin: 660, endMin: 690, employeeId: empLogo2.id, serviceId: svcLogo.id, roomId: room4.id, clientOffset: 2 },
    { startMin: 690, endMin: 720, employeeId: empPsycho.id, serviceId: svcPsycho.id, roomId: room3.id, clientOffset: 4 },
    { startMin: 690, endMin: 720, employeeId: empMass2.id, serviceId: svcMassage.id, roomId: roomMass2.id, clientOffset: 6 },
    { startMin: 840, endMin: 870, employeeId: empLogo1.id, serviceId: svcLogo.id, roomId: room2.id, clientOffset: 8 },
    { startMin: 840, endMin: 870, employeeId: empAfk1.id, serviceId: svcAfk.id, roomId: roomAfk.id, clientOffset: 1 },
    { startMin: 840, endMin: 870, employeeId: empMass1.id, serviceId: svcMassage.id, roomId: roomMass1.id, clientOffset: 3 },
    { startMin: 870, endMin: 900, employeeId: empLogo2.id, serviceId: svcLogo.id, roomId: room4.id, clientOffset: 5 },
    { startMin: 870, endMin: 900, employeeId: empPsycho.id, serviceId: svcPsycho.id, roomId: room3.id, clientOffset: 7 },
    { startMin: 900, endMin: 945, employeeId: empNeuro.id, serviceId: svcDetenzor.id, roomId: room1.id, clientOffset: 9 },
    { startMin: 900, endMin: 930, employeeId: empAfk2.id, serviceId: svcAfk.id, roomId: roomAfk.id, clientOffset: 0 },
    { startMin: 930, endMin: 960, employeeId: empMass2.id, serviceId: svcMassage.id, roomId: roomMass2.id, clientOffset: 2 },
    { startMin: 960, endMin: 990, employeeId: empLogo1.id, serviceId: svcLogo.id, roomId: room2.id, clientOffset: 4 },
    { startMin: 990, endMin: 1020, employeeId: empAfk1.id, serviceId: svcAfk.id, roomId: roomAfk.id, clientOffset: 6 },
  ];

  const appointments: Apt[] = [];

  weekDays.forEach((date, dayIndex) => {
    for (const slot of dayPlan) {
      // Сдвигаем клиентов по дням, чтобы недельный сетка не была копипастой одного дня.
      const client = clientPool[(slot.clientOffset + dayIndex * 3) % clientPool.length]!;
      appointments.push(
        apt({
          date,
          startMin: slot.startMin,
          endMin: slot.endMin,
          clientId: client.id,
          employeeId: slot.employeeId,
          serviceId: slot.serviceId,
          roomId: slot.roomId,
          status: dayIndex === 0 && slot.startMin < 660 ? "DONE" : "PLANNED",
        }),
      );
    }

    // Групповая галокамера раз в день в 12:00 — Яшины (AGE_8_11).
    const haloGroupId = id("gs");
    appointments.push(
      apt({
        date,
        startMin: 720,
        endMin: 750,
        note: "Группа",
        groupSessionId: haloGroupId,
        groupAgeRange: "AGE_8_11",
        clientId: cliYashina.id,
        employeeId: empAfk1.id,
        serviceId: svcHalo.id,
        roomId: null,
      }),
      apt({
        date,
        startMin: 720,
        endMin: 750,
        note: "Группа",
        groupSessionId: haloGroupId,
        groupAgeRange: "AGE_8_11",
        clientId: cliYashin.id,
        employeeId: empAfk1.id,
        serviceId: svcHalo.id,
        roomId: null,
      }),
    );
  });

  const courseActiveId = id("course");
  const courseFinishingId = id("course");
  const courseActive2Id = id("course");
  const courseCompletedId = id("course");
  const nowIso = new Date().toISOString();
  const emptyNotes = [] as Array<{
    id: string;
    courseId: string;
    body: string;
    createdAt: string;
    updatedAt: string;
    authorUserId: string;
    authorName: string;
    authorUsername: string;
  }>;
  const clientCourses = [
    {
      id: courseActiveId,
      clientId: cliYashina.id,
      startedAt: day,
      completedAt: null as string | null,
      isCompleted: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      notes: emptyNotes,
    },
    {
      id: courseActive2Id,
      clientId: cliAlekhin.id,
      startedAt: day,
      completedAt: null,
      isCompleted: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      notes: emptyNotes,
    },
    {
      id: courseFinishingId,
      clientId: cliSokolova.id,
      startedAt: day,
      completedAt: null,
      isCompleted: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      notes: emptyNotes,
    },
    {
      id: courseCompletedId,
      clientId: cliIvanov.id,
      startedAt: day,
      completedAt: day,
      isCompleted: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      notes: emptyNotes,
    },
  ];

  const documentRouteStages = [
    { id: id("stg"), title: "Договор", sortOrder: 0, isActive: true },
    { id: id("stg"), title: "Согласие на ПДн", sortOrder: 1, isActive: true },
    { id: id("stg"), title: "Диагностика", sortOrder: 2, isActive: true },
    { id: id("stg"), title: "План занятий", sortOrder: 3, isActive: true },
  ];

  const check = (courseId: string, stageId: string) => ({
    courseId,
    stageId,
    checked: true,
    checkedAt: nowIso,
    checkedByUserId: userId,
  });

  const documentRouteChecks: Array<{
    courseId: string;
    stageId: string;
    checked: boolean;
    checkedAt: string | null;
    checkedByUserId: string | null;
  }> = [
    // На курсе: частично отмечено
    check(courseActiveId, documentRouteStages[0]!.id),
    check(courseActive2Id, documentRouteStages[0]!.id),
    check(courseActive2Id, documentRouteStages[1]!.id),
    // Заканчивают: все этапы отмечены, курс ещё не закрыт
    ...documentRouteStages.map((stage) => check(courseFinishingId, stage.id)),
    // Закончили: закрытый курс с полным чек-листом
    ...documentRouteStages.map((stage) => check(courseCompletedId, stage.id)),
  ];

  const documentVariables = [
    { id: id("var"), key: "FIO", label: "ФИО", sortOrder: 0 },
    { id: id("var"), key: "FIO_SHORT", label: "ФИО кратко", sortOrder: 1 },
    { id: id("var"), key: "BIRTH", label: "Дата рождения", sortOrder: 2 },
    { id: id("var"), key: "PHONE", label: "Телефон", sortOrder: 3 },
    { id: id("var"), key: "EMAIL", label: "Email", sortOrder: 4 },
    { id: id("var"), key: "ADDRESS", label: "Адрес", sortOrder: 5 },
    { id: id("var"), key: "LEGAL_REP", label: "Законный представитель", sortOrder: 6 },
    { id: id("var"), key: "GROUP", label: "Группа учёта", sortOrder: 7 },
    { id: id("var"), key: "ADMIN", label: "Администратор", sortOrder: 8 },
    { id: id("var"), key: "DATE", label: "Дата документов", sortOrder: 9 },
  ];

  const documentTemplates = [
    {
      id: id("tpl"),
      title: "Карточка клиента",
      fileName: "kartochka.docx",
      assetUrl: "templates/kartochka.docx",
      fileDataBase64: "",
      sortOrder: 0,
      createdAt: nowIso,
    },
    {
      id: id("tpl"),
      title: "Согласие на ПДн",
      fileName: "soglasie.docx",
      assetUrl: "templates/soglasie.docx",
      fileDataBase64: "",
      sortOrder: 1,
      createdAt: nowIso,
    },
  ];

  const mid = weekDays[2] ?? day;
  const last = weekDays[weekDays.length - 1] ?? day;
  const diagnosticPeriods = [
    {
      id: id("diag"),
      title: "Диагностика АФК",
      startDate: day,
      endDate: mid,
      note: null as string | null,
      roomId: roomAfk.id,
      durationMin: 30,
      participantIds: [empAfk2.id],
      intervals: [
        { id: id("dint"), date: day, startMin: 540 },
        { id: id("dint"), date: day, startMin: 570 },
        { id: id("dint"), date: mid, startMin: 540 },
        { id: id("dint"), date: mid, startMin: 570 },
      ],
    },
    {
      id: id("diag"),
      title: "Скрининг АФК (утро)",
      startDate: mid,
      endDate: last,
      note: null as string | null,
      roomId: roomAfk.id,
      durationMin: 30,
      participantIds: [empAfk1.id],
      intervals: [
        { id: id("dint"), date: mid, startMin: 600 },
        { id: id("dint"), date: last, startMin: 600 },
      ],
    },
  ];

  return {
    seededAt: today(),
    demoDay: day,
    users: [
      {
        id: userId,
        username: DEMO_ACCOUNTS[0]!.username,
        password: DEMO_ACCOUNTS[0]!.password,
        role: DEMO_ACCOUNTS[0]!.role,
        displayName: DEMO_ACCOUNTS[0]!.label,
        employeeId: null as string | null,
        employeeActive: null as boolean | null,
        createdAt: nowIso,
      },
      {
        id: id("user"),
        username: DEMO_ACCOUNTS[1]!.username,
        password: DEMO_ACCOUNTS[1]!.password,
        role: DEMO_ACCOUNTS[1]!.role,
        displayName: DEMO_ACCOUNTS[1]!.label,
        employeeId: null as string | null,
        employeeActive: null as boolean | null,
        createdAt: nowIso,
      },
      {
        id: id("user"),
        username: DEMO_ACCOUNTS[2]!.username,
        password: DEMO_ACCOUNTS[2]!.password,
        role: DEMO_ACCOUNTS[2]!.role,
        displayName: DEMO_ACCOUNTS[2]!.label,
        employeeId: empNeuro.id,
        employeeActive: true,
        createdAt: nowIso,
      },
      {
        id: id("user"),
        username: DEMO_ACCOUNTS[3]!.username,
        password: DEMO_ACCOUNTS[3]!.password,
        role: DEMO_ACCOUNTS[3]!.role,
        displayName: DEMO_ACCOUNTS[3]!.label,
        employeeId: empAfk1.id,
        employeeActive: true,
        createdAt: nowIso,
      },
    ],
    sessions: {} as Record<string, string>,
    specialties,
    rooms,
    services,
    employees,
    clients,
    clientGroups,
    absences: [] as Array<{
      id: string;
      employeeId: string;
      type: "SICK" | "BUSINESS_TRIP" | "VACATION" | "DAY_OFF" | "OTHER";
      startDate: string;
      endDate: string;
      startMin?: number | null;
      endMin?: number | null;
      note?: string | null;
    }>,
    appointments,
    clinicWorkDays: [
      { id: id("cwd"), weekday: 1, isOpen: true, startMin: 540, endMin: 1080 },
      { id: id("cwd"), weekday: 2, isOpen: true, startMin: 540, endMin: 1080 },
      { id: id("cwd"), weekday: 3, isOpen: true, startMin: 540, endMin: 1080 },
      { id: id("cwd"), weekday: 4, isOpen: true, startMin: 540, endMin: 1080 },
      { id: id("cwd"), weekday: 5, isOpen: true, startMin: 540, endMin: 1005 },
      { id: id("cwd"), weekday: 6, isOpen: false, startMin: 540, endMin: 1080 },
      { id: id("cwd"), weekday: 7, isOpen: false, startMin: 540, endMin: 1080 },
    ],
    diagnosticPeriods,
    documentTemplates,
    documentVariables,
    documentRouteStages,
    documentRouteChecks,
    clientCourses,
    features: { diagnosticBookingMode: "windows" },
  };
}
