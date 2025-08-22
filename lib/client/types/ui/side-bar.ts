export interface User {
  name: string;
  email: string;
  avatar: string;
}

export interface Team {
  name: string;
  logo: React.ElementType;
  plan: string;
}

export interface BaseNavigationItem {
  title: string;
}

export interface NavigationItemWithUrl extends BaseNavigationItem {
  url: string;
}

export interface NavigationItemWithFragment extends BaseNavigationItem {
  fragment: string;
}

export type NavigationItem = NavigationItemWithUrl | NavigationItemWithFragment;

export interface NavigationSection {
  title: string;
  url: string;
  icon?: React.ElementType;
  items?: NavigationItem[];
  isActive?: boolean;
}

export interface Project {
  name: string;
  url: string;
  icon: React.ElementType;
}

export interface SideBarDataSchema {
  user: User;
  teams: Team[];
  sections: NavigationSection[];
  projects: Project[];
}
