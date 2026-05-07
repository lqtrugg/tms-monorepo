export abstract class ValueObject<Props> {
  protected constructor(protected readonly props: Props) {}

  equals(other: ValueObject<Props>): boolean {
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
