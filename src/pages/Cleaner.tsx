import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Fragment, useEffect, useState } from 'react';
import { doBatchBurnAndClose, doBatchClose, doBatchTransfer } from '../web3/BatchTransfer';
import { loadOwnedTokens, TokenInfos } from '../web3/TokensLoader';
import StickyBox from 'react-sticky-box';
import { Tab, Menu, Dialog, Transition } from '@headlessui/react'
import toast from 'react-hot-toast';
import { Notification } from '../components/Notification';
import { ChevronDownIcon, ExclamationCircleIcon, FireIcon, XCircleIcon, PaperAirplaneIcon, KeyIcon } from '@heroicons/react/24/outline'
import { PublicKey } from '@solana/web3.js'
import InfoBtnSVG from '../assets/info_btn.svg';
import * as web3 from "@solana/web3.js";

const Cleaner = () => {
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [isLoadingNft, setLoadingNft] = useState<boolean>(true);
  const [tokenInfos, setTokensInfos] = useState<TokenInfos[]>([]);
  const [tokensSelected, setTokensSelected] = useState<boolean[]>([]);
  const [tokensDeleted, setTokensDeleted] = useState<boolean[]>([]);
  const [tokensTotal, setTokensTotal] = useState(0);
  const [tokensLoaded, setTokensLoaded] = useState(0);
  const [inputWalletID, setWalletID] = useState("");
  const [isCleaning, setIsCleaning] = useState(false);
  const [isSending, setIsSending] = useState(false);

  function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
  }

  let [isOpen, setIsOpen] = useState(false)

  function closeModal() {
    setIsOpen(false)
  }

  function openModal() {
    setIsOpen(true)
  }

  useEffect(() => {
    (async () => {
      if (!publicKey) {
        setLoadingNft(true);
        return;
      }
      let tokens = await loadOwnedTokens(connection, publicKey, (loaded, total) => {
        console.log('Loaded ' + loaded + '/' + total);
        setTokensLoaded(loaded);
        setTokensTotal(total);
      });
      let selected = tokens.map((t) => false);
      setLoadingNft(false);
      setTokensInfos(tokens);
      setTokensSelected(selected);
      setTokensDeleted(selected);
    })();
  }, [publicKey]);

  const checkName = (name: string | undefined) => {

    if (name !== undefined) {
      if (name.length == 8) {
        if (name.endsWith("..")) return "Unknown token"
        return name;
      } else {
        return "";
      }
    } else {
      return "";
    }

  }

  const validateSolAddress = (address: string) => {
    try {
      let pubkey = new PublicKey(address)
      let isSolana = PublicKey.isOnCurve(pubkey)
      return isSolana
    } catch (error) {
      return false
    }
  }

  const onSelect = async (idx: number) => {
    let copy = [...tokensSelected];
    copy[idx] = !copy[idx];
    let token = tokenInfos[idx];
    console.log(token.name + (copy[idx] ? " selected" : " deselected") + ":" + token.mint);
    setTokensSelected(copy);
  };

  const onSelectAll = async () => {
    let copySelected = [...tokensSelected];
    for (let i = 0; i < copySelected.length; i++) copySelected[i] = true;
    setTokensSelected(copySelected);
  }

  const onDeselectAll = async () => {
    let copySelected = [...tokensSelected];
    for (let i = 0; i < copySelected.length; i++) copySelected[i] = false;
    setTokensSelected(copySelected);
  }

  const doTransfer = async (recipient: string) => {
    setIsSending(true);
    if (!wallet) return;


    let tokens = tokenInfos.reduce((prev, curr, index) => {
      if (tokensSelected[index]) {
        prev.push(curr);
      }
      return prev;
    }, [] as TokenInfos[]);
    if (tokens.length <= 0) {
      setIsSending(false);
      return;
    }
    let isSolAddress = validateSolAddress(recipient);
    if (isSolAddress) {
      console.log('The address is valid')
    } else {
      console.log('The address is NOT valid')
      toast.custom(<Notification message={'Error: This address is invalid.'} variant="error" />);
      setIsSending(false);
      return;
    }
    let walletTarget = new web3.PublicKey(recipient);

    tokens.forEach((token) => {
      console.log("Ready to transfer " + token.name + ", " + token.mint);
    })

    await doBatchTransfer(
      connection,
      wallet,
      walletTarget,
      tokens,
      (i) => {
        console.log('success ' + i);
        toast.custom(<Notification message={'Transfer of ' + totalSelected + ' tokens completed.'} variant="success" />);
        let copyDeleted = [...tokensDeleted];
        let copySelected = [...tokensSelected];
        for (let i = 0; i < copySelected.length; i++) {
          if (copySelected[i] == true) {
            copyDeleted[i] = true;
            setTokensDeleted(copyDeleted);
          }
        }
      },
      (i, err) => {
        console.log('error ' + i, err);
        toast.custom(<Notification message={err} variant="error" />);

      }
    ).catch((error) => {
      console.log(error);
      toast.custom(<Notification message={error} variant="error" />);
    });

    let copy = [...tokensSelected];
    for (let i = 0; i < copy.length; i++) copy[i] = false;
    setTokensSelected(copy);
    setIsSending(false);
    closeModal();
  };

  const doBurn = async () => {
    setIsCleaning(true);
    if (!wallet) return;

    let tokens = tokenInfos.reduce((prev, curr, index) => {
      if (tokensSelected[index]) {
        prev.push(curr);
      }
      return prev;
    }, [] as TokenInfos[]);
    if (tokens.length <= 0) {
      console.log("dsfsdf");
      setIsCleaning(false);
      toast.custom(<Notification message={'You need to select something first...'} variant="error" />);
      return;
    }

    await doBatchBurnAndClose(
      connection,
      wallet,
      tokens,
      (i) => {
        console.log('Burn success ' + i);
        toast.custom(<Notification message={'Success. We burned ' + totalSelected + ' tokens.'} variant="success" />);
        let copyDeleted = [...tokensDeleted];
        let copySelected = [...tokensSelected];
        for (let i = 0; i < copySelected.length; i++) {
          if (copySelected[i] == true) {
            copyDeleted[i] = true;
            setTokensDeleted(copyDeleted);
          }
        }
      },
      (i, err) => {
        console.log('Burn error ' + i, err);
        toast.custom(<Notification message={err} variant="error" />);
      }
    ).catch((error) => {
      console.log(error);
      toast.custom(<Notification message={error} variant="error" />);
    });

    let copy = [...tokensSelected];
    for (let i = 0; i < copy.length; i++) copy[i] = false;
    setTokensSelected(copy);
    setIsCleaning(false);
  };

  const doClose = async () => {
    if (!wallet) return;

    let tokens = tokenInfos.reduce((prev, curr, index) => {
      if (tokensSelected[index]) {
        prev.push(curr);
      }
      return prev;
    }, [] as TokenInfos[]);
    if (tokens.length <= 0) return;
    console.log(tokens)
    await doBatchClose(
      connection,
      wallet,
      tokens,
      (i) => {
        console.log('Close success ' + i);
        toast.custom(<Notification message={'Success. We closed ' + totalSelected + ' tokens.'} variant="success" />);
        let copyDeleted = [...tokensDeleted];
        let copySelected = [...tokensSelected];
        for (let i = 0; i < copySelected.length; i++) {
          if (copySelected[i] == true) {
            copyDeleted[i] = true;
            setTokensDeleted(copyDeleted);
          }
        }
      },
      (i, err) => {
        console.log('Close error ' + i, err);
        toast.custom(<Notification message={err} variant="error" />);
      }
    ).catch((error) => {
      console.log(error);
      toast.custom(<Notification message={error} variant="error" />);
    });
    let copy = [...tokensSelected];
    for (let i = 0; i < copy.length; i++) copy[i] = false;
    setTokensSelected(copy);
  };


  let totalSelected = tokensSelected.reduce((p, c) => p + (c ? 1 : 0), 0);

  return (
    <div className="mt-10">
      <div className="text-center font-extralight mt-14 mb-10">
        <Transition appear show={isOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={closeModal}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-secondary p-6 text-left align-middle shadow-xl transition-all border-4 border-secondary-h">
                    <Dialog.Title
                      as="h3"
                      className="text-lg text-gray-900"
                    >
                      Bulk Transfer
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-2">
                        Bulk send NFTs or SPL tokens to another wallet.
                        <br /><u>Note:</u> When you send SPL tokens, you send the entire amount to the recipient.
                      </p>
                      <label className="relative block">
                        <span className="sr-only">Search</span>
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2">
                          <KeyIcon className="mr-2 h-5 w-5 align-middle" aria-hidden="true" />
                        </span>
                        <input className="placeholder:italic placeholder:text-slate-400 block bg-white w-full border border-slate-300 rounded-md py-2 pl-9 pr-3 shadow-sm focus:outline-none focus:border-sky-500 focus:ring-third focus:ring-2 focus:bg-third focus:bg-opacity-30 sm:text-sm" placeholder="Walled public key" type="text" name="walletID" onChange={(e) => { setWalletID(e.target.value) }} />
                      </label>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        disabled={isSending}
                        className="inline-flex justify-center rounded-md border border-transparent bg-third px-4 py-2 text-sm font-medium text-primary hover:bg-third-h focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        onClick={() => doTransfer(inputWalletID)}
                      >
                        {isSending ? (
                          <svg className="animate-spin mx-auto h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        ) : (
                          'Send ' + totalSelected + ' tokens'
                        )}

                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
        <div className="mt-10">
          <div className="bg-grayDark round-md p-4 md:grid md:grid-cols-3 gap-8 xl:gap-16">
            <div className='class="font-sansLight text-left text-sm md:col-span-2 lg:col-span-1 mb-4 md:mb-0'>
              <h1 className="font-serif text-3xl mb-2 text-fourth">Cleaner 0.1</h1>
              <p className="font-sansLight  text-secondary">
                The Wallet Cleaner offers 3 tools that will help you keep your wallets clean and safe.</p>
              <div className='md:flex gap-2 mt-4'>
                <div className='has-tooltip hover:text-fourth hover:bg-fourth hover:bg-opacity-40 p-2 rounded-sm text-secondary bg-secondary-h bg-opacity-20'>
                  <span className='tooltip bg-secondary text-primary rounded-sm shadow-md p-3 w-full md:w-72 md:max-w-sm bottom-0 left-0 transform translate-y-full'>A NFT is not burnable for $ASH ? You can now burn it anyways and get the SOL rent back.</span>
                  Burn
                </div>
                <div className='has-tooltip hover:text-fourth hover:bg-fourth hover:bg-opacity-40 p-2 rounded-sm text-secondary bg-secondary-h bg-opacity-20'>
                  <span className='tooltip bg-secondary text-primary rounded-sm shadow-md p-3 w-full md:w-72 md:max-w-sm bottom-0 left-0 transform translate-y-full'>SPL tokens and NFTs you once had can still have a token account linked to your wallet. Close those accounts and get the SOL rent back.</span>
                  Close
                </div>
                <div className='has-tooltip hover:text-fourth hover:bg-fourth hover:bg-opacity-40 p-2 rounded-sm  text-secondary bg-secondary-h bg-opacity-20'>
                  <span className='tooltip bg-secondary text-primary rounded-sm shadow-md p-3 w-full md:w-72 md:max-w-sm bottom-0 left-0 transform translate-y-full'>A tool to easily transfer all your rugs and scam NFTs into a single “burner” wallet.</span>
                  Transfer
                </div>
                <div className='has-tooltip hover:text-fourth hover:bg-fourth hover:bg-opacity-40 p-2 rounded-sm  text-secondary bg-secondary-h bg-opacity-20'>
                  <span className='tooltip bg-secondary text-primary rounded-sm shadow-md p-3 w-full md:w-72 md:max-w-sm bottom-0 left-0 transform translate-y-full'>The SOL rent is a small fee charged by Solana to store token accounts on the blockchain. When you burn a token or close a token account, the SOL rent (~0.002 SOL) can be reclaimed.</span>
                  What is the SOL rent ?
                </div>
              </div>




            </div>
            <div className='cols-span-1 col-start-3 flex md:items-end md:justify-end'>
              {
                (isLoadingNft && wallet) ?
                  <button type="button" className="inline-flex px-4 py-2 font-sans leading-6 text-sm shadow rounded-md text-black bg-third hover:bg-third-h transition ease-in-out duration-150 cursor-not-allowed" disabled>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading tokens {tokensLoaded + '/' + tokensTotal}
                  </button>
                  :
                  <></>
              }
            </div>

          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:gird-cols-4 lg:grid-cols-5 justify-items-center mt-4 m-auto gap-2 sm:gap-4 ">
            <div className="col-span-2 w-full sm:col-span-1">
              <StickyBox offsetTop={20} offsetBottom={20} className={'z-20'}>
                <div className="bg-grayDark round-md p-4">
                  <div className="flex flex-col mb-4">
                    <div className="text-left">
                      <h1 className="font-sansLight mb-2  pb-2 text-left text-secondary border-b border-primary pr-3">
                        Info
                      </h1>
                      <div className="flex justify-between text-sm pb-2 border-b border-primary mb-2">
                        <span className="font-sansLight text-secondary ">Number of items</span>
                        <span className="text-third">{!wallet ? 0 : tokenInfos.length}</span>
                      </div>
                      <div className="flex justify-between text-sm pb-2 border-b border-primary mb-2">
                        <span className="font-sansLight text-secondary ">Selected items</span>
                        <span className="text-third">{!wallet ? 0 : totalSelected}</span>
                      </div>
                      <div className="flex justify-between text-sm pb-2 border-b border-primary mb-2">
                        <span className="font-sansLight text-secondary ">
                          Required transactions
                        </span>
                        <span className="text-third">{!wallet ? 0 : Math.ceil(totalSelected / 12)}</span>
                      </div>
                    </div>
                  </div>
                  {/* <button
            onClick={() => onMint(10)}
            style={{
              backgroundColor: '#4e44ce',
              padding: '0 20px',
              borderRadius: '6px',
              height: '50px',
              margin: '10px',
            }}
          >
            Mint x10
          </button> */}


                  <button
                    onClick={() => doBurn()}
                    disabled={!wallet}
                    className={`${!wallet ? 'opacity-25 cursor-not-allowed' : ''
                      } rounded-md mb-4 text-center w-full bg-fourth hover:bg-fourth-h text-primary hover:text-primary-h font-sans px-4 py-1 pt-2 inline-block transition-colors duration-200 ease-in-out`}
                  >
                    {isCleaning ? (
                      <svg className="animate-spin mx-auto h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      ("Burn")
                    )}
                  </button>

                  <Menu as="div" className="relative">
                    <div>
                      <Menu.Button className="inline-flex w-full justify-center rounded-md bg-black bg-opacity-20 px-4 py-2 text-sm font-medium text-secondary hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
                        Tools
                        <ChevronDownIcon
                          className="ml-2 -mr-1 h-5 w-5 text-violet-200 hover:text-violet-100"
                          aria-hidden="true"
                        />
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 mt-2 w-full origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="px-1 py-1 ">
                          <Menu.Item disabled={(totalSelected == 0 ? true : false || !wallet)}>
                            {({ active }) => (
                              <button
                                onClick={() => doBurn()}
                                className={`${active ? 'bg-third text-white' : (totalSelected == 0 || !wallet ? 'text-gray-900 opacity-25 cursor-not-allowed' : 'text-gray-900')
                                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                              >
                                <div className='flex justify-between w-full'>
                                  <div className='flex'>
                                    {active ? (
                                      <FireIcon
                                        className="mr-2 h-5 w-5 align-middle"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <FireIcon
                                        className="mr-2 h-5 w-5 align-middle"
                                        aria-hidden="true"
                                      />
                                    )}
                                    <span className='text-sm leading-3 self-center mt-1'> Burn</span>
                                  </div>
                                  {active ? (
                                    <span className='opacity-50 text-xs self-center mt-1 font-sansLight'>{totalSelected} tokens</span>
                                  ) : (
                                    <span className='opacity-50 text-xs self-center mt-1'></span>
                                  )}

                                </div>
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item disabled={(totalSelected == 0 ? true : false || !wallet)}>
                            {({ active }) => (
                              <button
                                onClick={() => doClose()}
                                className={`${active ? 'bg-third text-white' : (totalSelected == 0 || !wallet ? 'text-gray-900 opacity-25 cursor-not-allowed' : 'text-gray-900')
                                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                              >
                                <div className='flex justify-between w-full'>
                                  <div className='flex'>
                                    {active ? (
                                      <XCircleIcon
                                        className="mr-2 h-5 w-5 align-middle"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <XCircleIcon
                                        className="mr-2 h-5 w-5 align-middle"
                                        aria-hidden="true"
                                      />
                                    )}
                                    <span className='text-sm leading-3 self-center mt-1'> Close</span>
                                  </div>
                                  {active ? (
                                    <span className='opacity-50 text-xs self-center mt-1 font-sansLight'>{totalSelected} tokens</span>
                                  ) : (
                                    <span className='opacity-50 text-xs self-center mt-1'></span>
                                  )}

                                </div>
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item disabled={(totalSelected == 0 ? true : false || !wallet)}>
                            {({ active }) => (
                              <button
                                onClick={() => openModal()}
                                className={`${active ? 'bg-third text-white' : (totalSelected == 0 || !wallet ? 'text-gray-900 opacity-25 cursor-not-allowed' : 'text-gray-900')
                                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                              >
                                <div className='flex justify-between w-full'>
                                  <div className='flex'>
                                    {active ? (
                                      <PaperAirplaneIcon
                                        className="mr-2 h-5 w-5 align-middle"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <PaperAirplaneIcon
                                        className="mr-2 h-5 w-5 align-middle"
                                        aria-hidden="true"
                                      />
                                    )}
                                    <span className='text-sm leading-3 self-center mt-1'> Transfer</span>
                                  </div>
                                  {active ? (
                                    <span className='opacity-50 text-xs self-center mt-1 font-sansLight'>{totalSelected} tokens</span>
                                  ) : (
                                    <span className='opacity-50 text-xs self-center mt-1'></span>
                                  )}

                                </div>
                              </button>
                            )}
                          </Menu.Item>
                          {/* <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => doTransfer()}
                    className={`${
                      active ? 'bg-third text-white' : 'text-gray-900'
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                  >
                    <div className='flex justify-between w-full'>
                    <div className='flex'>
                    {active ? (
                      <PaperAirplaneIcon
                        className="mr-2 h-5 w-5 align-middle"
                        aria-hidden="true"
                      />
                    ) : (
                      <PaperAirplaneIcon
                        className="mr-2 h-5 w-5 align-middle"
                        aria-hidden="true"
                      />
                    )}
                   <span className='text-sm leading-3 self-center mt-1'> Send</span>
                   </div>
                   {active ? (
                      <span className='opacity-50 text-xs self-center mt-1 font-sansLight'>{totalSelected} tokens</span>
                    ) : (
                      <span className='opacity-50 text-xs self-center mt-1'></span>
                    )}
                    
                    </div>
                  </button>
                )}
              </Menu.Item> */}
                        </div>
                        <div className="px-1 py-1 bg-gray-100">
                          <Menu.Item disabled={(!wallet)}>
                            {({ active }) => (
                              <button
                                onClick={() => onSelectAll()}
                                className={`${active ? 'bg-third text-white' : (!wallet ? 'text-gray-900 opacity-25 cursor-not-allowed' : 'text-gray-900')
                                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                              >
                                {active ? (
                                  <></>
                                ) : (
                                  <></>
                                )}
                                Select All
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item disabled={(!wallet)}>
                            {({ active }) => (
                              <button
                                onClick={() => onDeselectAll()}
                                className={`${active ? 'bg-third text-white' : (!wallet ? 'text-gray-900 opacity-25 cursor-not-allowed' : 'text-gray-900')
                                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                              >
                                {active ? (
                                  <></>
                                ) : (
                                  <></>
                                )}
                                Deselect All
                              </button>
                            )}
                          </Menu.Item>
                        </div>
                        <div className="px-1 py-1">
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => window.open("https://discord.com/channels/905794664005791824/916285856854200330", "_blank")}
                                className={`${active ? 'bg-third text-white' : 'text-gray-900'
                                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                              >
                                {active ? (
                                  <ExclamationCircleIcon
                                    className="mr-2 h-5 w-5"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <ExclamationCircleIcon
                                    className="mr-2 h-5 w-5"
                                    aria-hidden="true"
                                  />
                                )}
                                Report a bug
                              </button>
                            )}
                          </Menu.Item>
                        </div>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
              </StickyBox>
            </div>
            <div className='col-span-2 sm:col-span-2 md:col-span-4 w-full'>
              <div className="w-full">
                <Tab.Group onChange={(index) => {
                  onDeselectAll()
                }}>
                  <Tab.List className="flex space-x-1 rounded-xl bg-grayDark p-1 mb-4">

                    <Tab
                      className={({ selected }) =>
                        classNames(
                          'w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-secondary',
                          'ring-opacity-60 ring-offset-2 ring-offset-third focus:outline-none focus:ring-2',
                          selected
                            ? 'bg-black bg-opacity-30 shadow text-third hover:text-third-h'
                            : 'text-blue-100 hover:bg-opacity-20 hover:bg-black '
                        )
                      }
                    >
                      NFTs
                    </Tab>
                    <Tab

                      className={({ selected }) =>
                        classNames(
                          'w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-secondary',
                          'ring-opacity-60 ring-offset-2 ring-offset-third focus:outline-none focus:ring-2',
                          selected
                            ? 'bg-black bg-opacity-30 shadow text-third hover:text-third-h'
                            : 'text-blue-100 hover:bg-opacity-20 hover:bg-black '
                        )
                      }
                    >
                      SPL Tokens
                    </Tab>
                    <Tab

                      className={({ selected }) =>
                        classNames(
                          'w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-secondary',
                          'ring-opacity-60 ring-offset-2 ring-offset-third focus:outline-none focus:ring-2',
                          selected
                            ? 'bg-black bg-opacity-30 shadow text-third hover:text-third-h'
                            : 'text-blue-100 hover:bg-opacity-20 hover:bg-black '
                        )
                      }
                    >
                      Unknown Tokens
                    </Tab>

                  </Tab.List>
                  <Tab.Panels className="mt-2">
                    <Tab.Panel className={classNames(
                      '',
                      ''
                    )} >
                      {(wallet) ?
                        <div className="col-span-2 lg:col-span-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 justify-items-center m-auto gap-2 sm:gap-4 ">

                          {tokenInfos.map((token, idx) => { return { token, globalIdx: idx } }).filter(data => data.token.isNFT && data.token.name !== undefined && !data.token.name.endsWith("..")).map((data) => {
                            return (
                              <div
                                key={data.globalIdx}
                                className={
                                  `relative w-full m-auto bg-grayDark rounded-md border-4 cursor-pointer duration-100  transform transition ` +
                                  (tokensSelected[data.globalIdx]
                                    ? ' border-third hover:border-third-h'
                                    : ' border-primary hover:border-secondary')
                                  +
                                  (tokensDeleted[data.globalIdx]
                                    ? ' hidden'
                                    : ' bts')
                                }
                              >
                                <div className="flex font-sansLight text-sm">
                                  <div
                                    className={
                                      `flex flex-col cursor-pointer flex-grow justify-evenly p-2` +
                                      (tokensSelected[data.globalIdx] ? ' text-third' : ' text-secondary')
                                    }
                                    onClick={() => {
                                      onSelect(data.globalIdx);
                                    }}
                                  >
                                    <div>
                                      {data.token.name}<br />
                                      <span className='text-xxs opacity-50 font-sansLight'>{checkName(data.token.name)}</span>
                                    </div>
                                    <div className="text-xs">
                                      <span className="font-sansLight text-secondary ">Amount:</span>
                                      <span className="text-third"> {data.token.uiAmount}</span>
                                    </div>
                                  </div>
                                  <div className="relative w-24 h-24 flex-shrink-0">
                                    <div className="absolute top-2 right-2">
                                      <a
                                        href={'https://solscan.io/token/' + data.token.address}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <img src={InfoBtnSVG} className={`pointer-events-none`} />
                                      </a>
                                    </div>
                                    <img
                                      className=" w-full h-full object-cover"
                                      src={
                                        data.token.iconUrl
                                          ? data.token.iconUrl
                                          : '/assets/cleaner/skull.png'
                                      }
                                      alt={'Token name: ' + data.token.name}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        :
                        <div className='bg-grayDark w-full h-56 flex items-center justify-center font-sansLight'>
                          <div>
                            <h3 className=' text-fourth'>Please connect your wallet.</h3>
                            <p className='text-secondary'>To use the Cleaner, you need to be connected.</p>
                          </div>
                        </div>

                      }
                    </Tab.Panel>
                    <Tab.Panel className={classNames(
                      '',
                      ''
                    )} >
                      {(wallet) ?
                        <div className="w-full col-span-2 lg:col-span-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 justify-items-center m-auto gap-2 sm:gap-4 ">
                          {tokenInfos.map((token, idx) => { return { token, globalIdx: idx } }).filter(data => !data.token.isNFT && data.token.name !== undefined && !data.token.name.endsWith("..")).map((data) => {
                            return (
                              <div
                                key={data.globalIdx}
                                className={
                                  `relative w-full m-auto bg-grayDark rounded-md border-4 cursor-pointer duration-100  transform transition ` +
                                  (tokensSelected[data.globalIdx]
                                    ? ' border-third hover:border-third-h'
                                    : ' border-primary hover:border-secondary')
                                  +
                                  (tokensDeleted[data.globalIdx]
                                    ? ' hidden'
                                    : ' bts')
                                }
                              >
                                <div className="flex font-sansLight text-sm">
                                  <div
                                    className={
                                      `flex flex-col cursor-pointer flex-grow justify-evenly p-2` +
                                      (tokensSelected[data.globalIdx] ? ' text-third' : ' text-secondary')
                                    }
                                    onClick={() => {
                                      onSelect(data.globalIdx);
                                    }}
                                  >
                                    <div>
                                      {data.token.name}<br />
                                      <span className='text-xxs opacity-50 font-sansLight'>{checkName(data.token.name)}</span>
                                    </div>
                                    <div className="text-xs">
                                      <span className="font-sansLight text-secondary ">Amount:</span>
                                      <span className="text-third"> {data.token.uiAmount}</span>
                                    </div>
                                  </div>
                                  <div className="relative w-24 h-24 flex-shrink-0">
                                    <div className="absolute top-2 right-2">
                                      <a
                                        href={'https://solscan.io/token/' + data.token.address}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <img src={InfoBtnSVG} className={`pointer-events-none`} />
                                      </a>
                                    </div>
                                    <img
                                      className=" w-full h-full object-cover"
                                      src={
                                        data.token.iconUrl
                                          ? data.token.iconUrl
                                          : '/assets/cleaner/skull.png'
                                      }
                                      alt={'Token name: ' + data.token.name}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        :
                        <div className='bg-grayDark w-full h-56 flex items-center justify-center font-sansLight'>
                          <div>
                            <h3 className=' text-fourth'>Please connect your wallet.</h3>
                            <p className='text-secondary'>To use the Cleaner, you need to be connected.</p>
                          </div>
                        </div>
                      }
                    </Tab.Panel>
                    <Tab.Panel className={classNames(
                      '',
                      ''
                    )} >
                      {(wallet) ?
                        <div className="col-span-2 lg:col-span-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 justify-items-center m-auto gap-2 sm:gap-4 ">
                          {tokenInfos.map((token, idx) => { return { token, globalIdx: idx } }).filter(data => data.token.name !== undefined && data.token.name.length == 8 && data.token.name.endsWith("..")).map((data) => {
                            return (
                              <div
                                key={data.globalIdx}
                                className={
                                  `relative w-full m-auto bg-grayDark rounded-md border-4 cursor-pointer duration-100  transform transition ` +
                                  (tokensSelected[data.globalIdx]
                                    ? ' border-third hover:border-third-h'
                                    : ' border-primary hover:border-secondary')
                                  +
                                  (tokensDeleted[data.globalIdx]
                                    ? ' hidden'
                                    : ' bts')
                                }
                              >
                                <div className="flex font-sansLight text-sm">
                                  <div
                                    className={
                                      `flex flex-col cursor-pointer flex-grow justify-evenly p-2` +
                                      (tokensSelected[data.globalIdx] ? ' text-third' : ' text-secondary')
                                    }
                                    onClick={() => {
                                      onSelect(data.globalIdx);
                                    }}
                                  >
                                    <div>
                                      {data.token.name}<br />
                                      <span className='text-xxs opacity-50 font-sansLight'>{checkName(data.token.name)}</span>
                                    </div>
                                    <div className="text-xs">
                                      <span className="font-sansLight text-secondary ">Amount:</span>
                                      <span className="text-third"> {data.token.uiAmount}</span>
                                    </div>
                                  </div>
                                  <div className="relative w-24 h-24 flex-shrink-0">
                                    <div className="absolute top-2 right-2">
                                      <a
                                        href={'https://solscan.io/token/' + data.token.address}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <img src={InfoBtnSVG} className={`pointer-events-none`} />
                                      </a>
                                    </div>
                                    <img
                                      className=" w-full h-full object-cover"
                                      src={
                                        data.token.iconUrl
                                          ? data.token.iconUrl
                                          : '/assets/cleaner/skull.png'
                                      }
                                      alt={'Token name: ' + data.token.name}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        :
                        <div className='bg-grayDark w-full h-56 flex items-center justify-center font-sansLight'>
                          <div>
                            <h3 className=' text-fourth'>Please connect your wallet.</h3>
                            <p className='text-secondary'>To use the Cleaner, you need to be connected.</p>
                          </div>
                        </div>
                      }
                    </Tab.Panel>

                  </Tab.Panels>
                </Tab.Group>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="lg:w-2/4 mx-auto"></div>
    </div>
  );
};

export default Cleaner;
