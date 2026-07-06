import { DebugGridRoute } from "./default/DebugGridRoute";
import { DefaultPlaytestRoute } from "./default/DefaultPlaytestRoute";
import type {
  DefaultRunRouteController,
  DefaultRunRouteView
} from "./defaultRunRouteTypes";

export type {
  DefaultRunRouteController,
  DefaultRunRouteView
} from "./defaultRunRouteTypes";

type DefaultRunRouteProps = {
  readonly view: DefaultRunRouteView;
  readonly controller: DefaultRunRouteController;
};

export const DefaultRunRoute = ({ view, controller }: DefaultRunRouteProps) =>
  view.isDefaultRoute ? (
    <DefaultPlaytestRoute view={view} controller={controller} />
  ) : (
    <DebugGridRoute view={view} controller={controller} />
  );
