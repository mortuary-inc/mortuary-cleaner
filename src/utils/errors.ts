
export function getErrMessage(err: any) {
    if (err && err.message) {
        return err.message;
    }
    return err;
}